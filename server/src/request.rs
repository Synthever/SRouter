//! Generic request helpers shared across the HTTP middleware and the feature
//! handlers: the peer address, the body-size cap, and cookie parsing.

use std::net::{IpAddr, SocketAddr};

use axum::extract::ConnectInfo;
use axum::http::{Extensions, HeaderMap, header};

use crate::constants;

/// Max accepted request body in bytes (25 MB). Matches Node MAX_BODY_BYTES.
pub const MAX_BODY_BYTES: u64 = 25 * 1024 * 1024;

/// Returns the client address for a request, using `cf-connecting-ip` only when
/// the operator opted in with `SROUTER_TRUST_CF_CONNECTING_IP` and the socket
/// peer is loopback. Every other request reports the socket peer address.
///
/// The flag is the whole trust decision: it may only be set where Cloudflare
/// overwrites `cf-connecting-ip` on every proxied request and is the only
/// service that can reach the listener over loopback. Under those conditions
/// the peer is `cloudflared` and the header carries the real client; anywhere
/// else the socket address is the truth.
///
/// Without this, every tunnelled request reports `127.0.0.1`: the admin login
/// throttle would key every operator onto one address, and the loopback
/// exemption in `api_key_auth` would treat the whole internet as local.
///
/// The Node build instead fell back to the request URL hostname when Hono's
/// `getConnInfo` failed in its test harness; that fallback let a remote client
/// claim `localhost` by setting `Host`, and is deliberately not reproduced.
pub fn client_address(
    headers: &HeaderMap,
    extensions: &Extensions,
    trust_cf_connecting_ip: bool,
) -> Option<String> {
    let peer = extensions
        .get::<ConnectInfo<SocketAddr>>()
        .map(|ConnectInfo(address)| address.ip().to_string());

    if trust_cf_connecting_ip
        && peer.as_deref().is_some_and(is_loopback_address)
        && let Some(forwarded) = header_address(headers)
    {
        return Some(forwarded);
    }

    peer
}

/// Reads `cf-connecting-ip` as a bare IP literal. A value carrying a port, a
/// hostname, or anything else unparseable is ignored rather than trusted.
fn header_address(headers: &HeaderMap) -> Option<String> {
    let value = headers.get(constants::headers::name::CF_CONNECTING_IP)?;
    let text = String::from_utf8_lossy(value.as_bytes());

    text.trim().parse::<IpAddr>().ok().map(|ip| ip.to_string())
}

/// Matches Node's `isLoopbackAddress`: lowercase, strip one `::ffff:` prefix,
/// then require exactly `127.0.0.1` or `::1`.
pub fn is_loopback_address(address: &str) -> bool {
    let lowercased = address.to_lowercase();
    let normalized = lowercased
        .strip_prefix("::ffff:")
        .unwrap_or(lowercased.as_str());

    normalized == "127.0.0.1" || normalized == "::1"
}

/// Cookie header parsing shared by the session middleware. Node joins duplicate
/// `Cookie` headers with `"; "` and passes quoted values through unchanged, so
/// both behaviors are kept; session tokens are base64url and need no
/// percent-decoding.
pub(crate) fn cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    let cookies = headers
        .get_all(header::COOKIE)
        .iter()
        .map(|value| String::from_utf8_lossy(value.as_bytes()).into_owned())
        .collect::<Vec<String>>()
        .join("; ");

    if cookies.is_empty() {
        return None;
    }

    cookies.split(';').find_map(|pair| {
        let (key, value) = pair.split_once('=')?;

        (key.trim() == name).then(|| value.trim().to_owned())
    })
}

#[cfg(test)]
mod tests {
    use std::net::SocketAddr;

    use axum::body::Body;
    use axum::extract::ConnectInfo;
    use axum::http::{HeaderMap, HeaderName, HeaderValue, Request, header};

    use super::{client_address, cookie_value, is_loopback_address};

    fn request_parts(
        headers: &[(&str, &str)],
        connect_info: Option<SocketAddr>,
    ) -> axum::http::request::Parts {
        let mut builder = Request::builder().uri("/v1/chat/completions");
        for (name, value) in headers {
            builder = builder.header(*name, *value);
        }

        let mut request = builder.body(Body::empty()).expect("request");
        if let Some(address) = connect_info {
            request.extensions_mut().insert(ConnectInfo(address));
        }

        request.into_parts().0
    }

    fn headers(pairs: &[(&str, &str)]) -> HeaderMap {
        let mut map = HeaderMap::new();
        for (name, value) in pairs {
            map.insert(
                HeaderName::from_bytes(name.as_bytes()).expect("header name"),
                HeaderValue::from_str(value).expect("header value"),
            );
        }
        map
    }

    #[test]
    fn loopback_addresses_are_exact() {
        assert!(is_loopback_address("127.0.0.1"));
        assert!(is_loopback_address("::1"));
        assert!(!is_loopback_address("127.0.0.2"));
        assert!(!is_loopback_address("203.0.113.7"));
        assert!(!is_loopback_address("localhost"));
        assert!(!is_loopback_address(""));
    }

    #[test]
    fn v4_mapped_loopback_is_normalized() {
        assert!(is_loopback_address("::FFFF:127.0.0.1"));
    }

    #[test]
    fn connect_info_supplies_the_client_address() {
        let parts = request_parts(&[], Some(SocketAddr::from(([203, 0, 113, 7], 5555))));

        assert_eq!(
            client_address(&parts.headers, &parts.extensions, false).as_deref(),
            Some("203.0.113.7")
        );
    }

    #[test]
    fn header_only_requests_have_no_client_address() {
        let parts = request_parts(
            &[("host", "localhost"), ("x-forwarded-for", "127.0.0.1")],
            None,
        );

        assert_eq!(
            client_address(&parts.headers, &parts.extensions, false),
            None
        );
    }

    #[test]
    fn connect_info_beats_request_headers() {
        let parts = request_parts(
            &[("host", "localhost")],
            Some(SocketAddr::from(([203, 0, 113, 7], 5555))),
        );

        assert_eq!(
            client_address(&parts.headers, &parts.extensions, false).as_deref(),
            Some("203.0.113.7")
        );
    }

    #[test]
    fn a_loopback_peer_ignores_the_forwarded_header_by_default() {
        let parts = request_parts(
            &[("cf-connecting-ip", "203.0.113.7")],
            Some(SocketAddr::from(([127, 0, 0, 1], 5555))),
        );

        assert_eq!(
            client_address(&parts.headers, &parts.extensions, false).as_deref(),
            Some("127.0.0.1")
        );
    }

    #[test]
    fn a_loopback_peer_reports_the_forwarded_client() {
        let parts = request_parts(
            &[("cf-connecting-ip", "203.0.113.7")],
            Some(SocketAddr::from(([127, 0, 0, 1], 5555))),
        );

        assert_eq!(
            client_address(&parts.headers, &parts.extensions, true).as_deref(),
            Some("203.0.113.7")
        );
    }

    #[test]
    fn a_remote_peer_ignores_the_forwarded_header_even_when_proxy_trust_is_enabled() {
        let parts = request_parts(
            &[("cf-connecting-ip", "127.0.0.1")],
            Some(SocketAddr::from(([198, 51, 100, 9], 5555))),
        );

        // A direct client must never be able to claim loopback, or the setup
        // route and the API-key exemption would open to the internet.
        assert_eq!(
            client_address(&parts.headers, &parts.extensions, true).as_deref(),
            Some("198.51.100.9")
        );
    }

    #[test]
    fn a_malformed_forwarded_header_falls_back_to_the_peer() {
        for value in ["203.0.113.7:443", "not-an-ip", "", "127.0.0.1, 10.0.0.1"] {
            let parts = request_parts(
                &[("cf-connecting-ip", value)],
                Some(SocketAddr::from(([127, 0, 0, 1], 5555))),
            );

            assert_eq!(
                client_address(&parts.headers, &parts.extensions, false).as_deref(),
                Some("127.0.0.1"),
                "{value}"
            );
        }
    }

    #[test]
    fn an_ipv6_forwarded_header_is_normalized() {
        let parts = request_parts(
            &[("cf-connecting-ip", "2001:DB8::1")],
            Some(SocketAddr::from(([127, 0, 0, 1], 5555))),
        );

        assert_eq!(
            client_address(&parts.headers, &parts.extensions, true).as_deref(),
            Some("2001:db8::1")
        );
    }

    #[test]
    fn the_admin_session_cookie_is_read_by_name() {
        let map = headers(&[("cookie", "a=1; srouter_admin_session=token; b=2")]);

        assert_eq!(
            cookie_value(&map, "srouter_admin_session").as_deref(),
            Some("token")
        );
    }

    #[test]
    fn a_missing_cookie_reads_as_none() {
        assert_eq!(
            cookie_value(&headers(&[("cookie", "a=1")]), "srouter_admin_session"),
            None
        );
        assert_eq!(cookie_value(&headers(&[]), "srouter_admin_session"), None);
    }

    #[test]
    fn duplicate_cookie_headers_are_joined() {
        let mut map = HeaderMap::new();
        map.append(header::COOKIE, HeaderValue::from_static("a=1"));
        map.append(
            header::COOKIE,
            HeaderValue::from_static("srouter_admin_session=token"),
        );

        assert_eq!(
            cookie_value(&map, "srouter_admin_session").as_deref(),
            Some("token")
        );
    }

    #[test]
    fn quoted_cookie_values_are_not_unwrapped() {
        // The Node cookie parser keeps the quotes, so the hashed value stays
        // wrong for a quoted token and Rust must reject it the same way.
        let map = headers(&[("cookie", "srouter_admin_session=\"token\"")]);

        assert_eq!(
            cookie_value(&map, "srouter_admin_session").as_deref(),
            Some("\"token\"")
        );
    }
}

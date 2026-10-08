package dev.ulloasp.mlsuite.schema.adapter.in.web;

import org.springframework.web.util.HtmlUtils;

import dev.ulloasp.mlsuite.schema.application.dto.PublicBookmarkDto;
import jakarta.servlet.http.HttpServletRequest;

/**
 * The page a link-unfurling crawler is shown for a public bookmark, since the real page is drawn
 * by the browser and a crawler reads none of it. It carries only Open Graph metadata: the
 * bookmark's name and text, the publisher's logo as the image, and a redirect to the page for a
 * person who lands here. nginx routes known crawlers to it; nothing else links it.
 */
final class PublicBookmarkPreview {

    /** Shown when the organization has no logo: the frontend's own brand image. */
    static final String DEFAULT_IMAGE_PATH = "/mlsuite.png";
    private static final int DESCRIPTION_MAX_LENGTH = 200;

    private PublicBookmarkPreview() {
    }

    static String html(PublicBookmarkDto bookmark, String origin) {
        String page = origin + "/explore/" + bookmark.publicId();
        String title = bookmark.name() + " by " + bookmark.organizationName();
        String image = origin + (bookmark.organizationLogoUrl() == null
                ? DEFAULT_IMAGE_PATH
                : bookmark.organizationLogoUrl());
        String description = description(bookmark);
        return """
                <!doctype html>
                <html lang="en">
                <head>
                <meta charset="utf-8">
                <title>%1$s</title>
                <meta name="description" content="%2$s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="MLSuite">
                <meta property="og:title" content="%1$s">
                <meta property="og:description" content="%2$s">
                <meta property="og:url" content="%3$s">
                <meta property="og:image" content="%4$s">
                <meta name="twitter:card" content="summary">
                <meta name="twitter:title" content="%1$s">
                <meta name="twitter:description" content="%2$s">
                <meta name="twitter:image" content="%4$s">
                <meta http-equiv="refresh" content="0; url=%3$s">
                <link rel="canonical" href="%3$s">
                </head>
                <body><a href="%3$s">%1$s</a></body>
                </html>
                """.formatted(escape(title), escape(description), escape(page), escape(image));
    }

    /** Where the site is reached from outside, as the proxy in front of the API reports it. */
    static String origin(HttpServletRequest request) {
        String proto = first(request.getHeader("X-Forwarded-Proto"), request.getScheme());
        String host = first(request.getHeader("X-Forwarded-Host"), request.getHeader("Host"));
        if (host == null || host.isBlank()) {
            host = request.getServerName() + ":" + request.getServerPort();
        }
        return proto + "://" + host;
    }

    private static String description(PublicBookmarkDto bookmark) {
        String text = bookmark.description() != null ? bookmark.description()
                : bookmark.publicationNote() != null ? bookmark.publicationNote()
                : "Run " + bookmark.name() + " by " + bookmark.organizationName() + " on MLSuite.";
        String oneLine = text.replaceAll("\\s+", " ").strip();
        return oneLine.length() <= DESCRIPTION_MAX_LENGTH
                ? oneLine
                : oneLine.substring(0, DESCRIPTION_MAX_LENGTH - 1).stripTrailing() + "…";
    }

    private static String first(String header, String fallback) {
        if (header == null || header.isBlank()) return fallback;
        int comma = header.indexOf(',');
        return (comma < 0 ? header : header.substring(0, comma)).strip();
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value, "UTF-8");
    }
}

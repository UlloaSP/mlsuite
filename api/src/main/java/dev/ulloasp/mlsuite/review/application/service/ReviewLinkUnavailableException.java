package dev.ulloasp.mlsuite.review.application.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public class ReviewLinkUnavailableException extends ResponseStatusException {
    public ReviewLinkUnavailableException() {
        super(HttpStatus.NOT_FOUND, "Review link unavailable");
    }
}

package dev.ulloasp.mlsuite.apiaccess.application.service;

/** The bookmark a call names, once the client is known to have been given it. */
record ApiTarget(Long bookmarkId, String apiId, String name) {
}

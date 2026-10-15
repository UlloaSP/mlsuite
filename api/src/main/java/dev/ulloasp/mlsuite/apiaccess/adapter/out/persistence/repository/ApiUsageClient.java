package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

/** One client's calls in a period, and how many of them were refused or failed. */
public interface ApiUsageClient {

    Long getClientId();

    String getClientName();

    Long getOrganizationId();

    long getCalls();

    long getErrors();
}

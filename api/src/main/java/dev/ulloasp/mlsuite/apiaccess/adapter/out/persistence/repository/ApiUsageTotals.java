package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

/** The calls of a period, read in one pass; {@code getP95} is null when none succeeded. */
public interface ApiUsageTotals {

    long getCalls();

    long getRejected();

    long getFailed();

    long getBusy();

    Double getP95();

    long getClients();

    long getOrganizations();
}

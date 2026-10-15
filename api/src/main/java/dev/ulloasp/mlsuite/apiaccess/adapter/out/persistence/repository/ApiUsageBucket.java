package dev.ulloasp.mlsuite.apiaccess.adapter.out.persistence.repository;

/** The calls of one hour or day that had any. */
public interface ApiUsageBucket {

    /** When the hour or day starts, in epoch seconds. */
    long getBucket();

    long getSucceeded();

    long getRejected();

    long getFailed();
}

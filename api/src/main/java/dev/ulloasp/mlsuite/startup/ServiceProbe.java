package dev.ulloasp.mlsuite.startup;

import java.io.IOException;

public interface ServiceProbe {

    void requireOk(String url) throws IOException;
}

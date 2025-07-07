package dev.ulloasp.mlsuite.security.jwt;

public interface JwtGenerator {

    String generate(JwtInfo info);

    JwtInfo getInfo(String token);

}

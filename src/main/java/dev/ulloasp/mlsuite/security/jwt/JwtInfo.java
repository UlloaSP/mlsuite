package dev.ulloasp.mlsuite.security.jwt;

public class JwtInfo {

    private Long userId;

    private String userName;

    private String role;

    public JwtInfo(Long userId, String userName, String role) {

        this.userId = userId;
        this.userName = userName;
        this.role = role;

    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

}

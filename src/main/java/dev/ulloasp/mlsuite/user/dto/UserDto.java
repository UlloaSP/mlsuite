package dev.ulloasp.mlsuite.user.dto;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

public class UserDto {

    Long id;
    String userName;
    String email;
    String oauthProvider;
    String displayName;
    String fullName;
    String avatarUrl;
    boolean isActive;
    String createdAt;

    public UserDto(Long id,
            String userName,
            String email,
            String oauthProvider,
            String displayName,
            String fullName,
            String avatarUrl,
            boolean isActive,
            OffsetDateTime createdAt) {
        this.id = id;
        this.userName = userName;
        this.email = email;
        this.oauthProvider = oauthProvider;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.fullName = fullName;
        this.isActive = isActive;
        this.createdAt = createdAt.format(DateTimeFormatter.ofPattern("MMM yyyy"));
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOauthProvider() {
        return oauthProvider;
    }

    public void setOauthProvider(String oauthProvider) {
        this.oauthProvider = oauthProvider;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

}

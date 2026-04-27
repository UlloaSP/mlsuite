package dev.ulloasp.mlsuite.auth.validation;

import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");

    public void validate(String password) {
        if (password == null || password.length() < 10) {
            throw new IllegalArgumentException("Password must be at least 10 characters long");
        }
        if (!UPPERCASE.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one uppercase letter");
        }
        if (!LOWERCASE.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one lowercase letter");
        }
        if (!DIGIT.matcher(password).find()) {
            throw new IllegalArgumentException("Password must contain at least one number");
        }
    }
}

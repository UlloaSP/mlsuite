package dev.ulloasp.mlsuite.security.local;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import dev.ulloasp.mlsuite.user.entity.User;
import dev.ulloasp.mlsuite.user.repository.UserRepository;

@Service
public class LocalUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public LocalUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));
        return new LocalUserDetails(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getAccountStatus());
    }
}

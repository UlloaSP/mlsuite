package dev.ulloasp.mlsuite.workspace;

import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import dev.ulloasp.mlsuite.user.domain.model.User;

/** A person's avatar: replaced and removed by them, read by anyone, pictured on their account. */
class UserAvatarTest extends ProfileFixture {

    private static final String AVATAR = ME + "/avatar";

    private static byte[] png(int width, int height) throws IOException {
        ByteArrayOutputStream encoded = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", encoded);
        return encoded.toByteArray();
    }

    private ResultActions upload(User user, byte[] bytes) throws Exception {
        return mockMvc.perform(signedIn(multipart(HttpMethod.PUT, AVATAR)
                .file(new MockMultipartFile("avatar", "me.png", "image/png", bytes)), user.getId()));
    }

    private String url(User user) throws Exception {
        String body = mockMvc.perform(as(user, get(ME))).andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("avatarUrl").asText();
    }

    @Test
    void anUploadIsCroppedSquareAndServedToAnyoneForGood() throws Exception {
        User ada = registered(unique("ada"));

        upload(ada, png(800, 400)).andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(startsWith("/api/public/users/" + ada.getId() + "/avatar?v=")));

        byte[] served = mockMvc.perform(get(url(ada)))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"))
                .andReturn().getResponse().getContentAsByteArray();
        BufferedImage image = ImageIO.read(new ByteArrayInputStream(served));
        assertEquals(256, image.getWidth());
        assertEquals(256, image.getHeight());
    }

    @Test
    void aPersonalAccountIsPicturedByItsOwnersAvatar() throws Exception {
        User ada = registered(unique("ada"));
        upload(ada, png(128, 128)).andExpect(status().isOk());

        mockMvc.perform(as(ada, get(CURRENT)))
                .andExpect(jsonPath("$.currentOrganization.logoUrl").value(url(ada)));
    }

    @Test
    void aNewPictureIsANewAddress() throws Exception {
        User ada = registered(unique("ada"));
        upload(ada, png(128, 128)).andExpect(status().isOk());
        String before = url(ada);
        Thread.sleep(2);

        upload(ada, png(256, 256)).andExpect(status().isOk());

        assertTrue(!before.equals(url(ada)));
    }

    @Test
    void whatIsNotAPictureOfTheRightSizeIsRefused() throws Exception {
        User ada = registered(unique("ada"));

        upload(ada, "<svg/>".getBytes()).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Upload a PNG or JPG image."));
        upload(ada, png(32, 32)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The picture must be at least 64 by 64 pixels."));
        upload(ada, new byte[2 * 1024 * 1024 + 1]).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("The picture must be at most 2 MB."));
        upload(ada, new byte[0]).andExpect(status().isBadRequest());
        assertNull(users.findById(ada.getId()).orElseThrow().getAvatarUpdatedAt());
    }

    @Test
    void removingIsAuditedAndLeavesNothingToRead() throws Exception {
        User ada = registered(unique("ada"));
        upload(ada, png(128, 128)).andExpect(status().isOk());
        String address = url(ada);

        mockMvc.perform(as(ada, delete(AVATAR))).andExpect(status().isOk()).andExpect(jsonPath("$.avatarUrl").isEmpty());
        mockMvc.perform(as(ada, delete(AVATAR))).andExpect(status().isOk());

        mockMvc.perform(get(address)).andExpect(status().isNotFound());
        for (String action : new String[] { "USER_AVATAR_REPLACE", "USER_AVATAR_REMOVE" }) {
            assertEquals(1L, entityManager.createNativeQuery(
                    "SELECT count(*) FROM audit_event WHERE action = :action AND target_id = :id")
                    .setParameter("action", action).setParameter("id", ada.getId().toString()).getSingleResult());
        }
    }

    @Test
    void changingItNeedsASession() throws Exception {
        mockMvc.perform(delete(AVATAR)).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart(HttpMethod.PUT, AVATAR)
                .file(new MockMultipartFile("avatar", "me.png", "image/png", png(128, 128))))
                .andExpect(status().isUnauthorized());
    }
}

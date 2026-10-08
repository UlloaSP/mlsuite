package dev.ulloasp.mlsuite.organization;

import static dev.ulloasp.mlsuite.support.TestFixtures.organization;
import static dev.ulloasp.mlsuite.support.TestFixtures.user;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationLogoRepository;
import dev.ulloasp.mlsuite.organization.adapter.out.persistence.repository.OrganizationRepository;
import dev.ulloasp.mlsuite.organization.application.dto.OrganizationDto;
import dev.ulloasp.mlsuite.organization.application.usecase.OrganizationLogoService;
import dev.ulloasp.mlsuite.organization.domain.exception.OrganizationAccessDeniedException;
import dev.ulloasp.mlsuite.organization.domain.model.Organization;
import dev.ulloasp.mlsuite.organization.domain.model.OrganizationLogo;
import dev.ulloasp.mlsuite.role.domain.model.PermissionKey;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAccessService;
import dev.ulloasp.mlsuite.workspace.application.service.WorkspaceAuthorizationService;

/** Replacing, normalizing, removing and reading an organization's logo. */
@ExtendWith(MockitoExtension.class)
class OrganizationLogoServiceTest {

    private static final long USER_ID = 7L;
    private static final long ORG_ID = 41L;

    @Mock private WorkspaceAccessService access;
    @Mock private WorkspaceAuthorizationService authorization;
    @Mock private OrganizationRepository organizations;
    @Mock private OrganizationLogoRepository logos;

    private OrganizationLogoService service;
    private Organization organization;

    @BeforeEach
    void setUp() {
        service = new OrganizationLogoService(access, authorization, organizations, logos);
        organization = organization(ORG_ID);
    }

    @Test
    void anOpaquePictureIsCroppedToItsCenterSquareShrunkAndStoredAsJpeg() throws IOException {
        editable();
        // Wide, with a red center: the crop keeps the middle, the sides go.
        BufferedImage wide = new BufferedImage(1200, 600, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = wide.createGraphics();
        g.setColor(Color.BLUE);
        g.fillRect(0, 0, 1200, 600);
        g.setColor(Color.RED);
        g.fillRect(300, 0, 600, 600);
        g.dispose();

        OrganizationDto result = service.replace(USER_ID, ORG_ID, upload(encode(wide, "png"), "image/png"));

        OrganizationLogo stored = storedLogo();
        assertEquals("image/jpeg", stored.getContentType());
        BufferedImage logo = ImageIO.read(new ByteArrayInputStream(stored.getContent()));
        assertEquals(256, logo.getWidth());
        assertEquals(256, logo.getHeight());
        Color corner = new Color(logo.getRGB(2, 2));
        assertTrue(corner.getRed() > 200 && corner.getBlue() < 60, "the center of the picture is what is kept");
        assertTrue(stored.getContent().length < 20_000, "a flat 256px JPEG is a few kilobytes");
        assertNotNull(organization.getLogoUpdatedAt());
        assertEquals("/api/public/organizations/41/logo?v=" + organization.getLogoUpdatedAt().toInstant().toEpochMilli(),
                result.logoUrl());
    }

    @Test
    void aPictureWithTransparencyStaysPngAndASmallOneIsNotEnlarged() throws IOException {
        editable();
        BufferedImage mark = new BufferedImage(100, 100, BufferedImage.TYPE_INT_ARGB);
        mark.setRGB(50, 50, new Color(0, 0, 0, 255).getRGB());

        service.replace(USER_ID, ORG_ID, upload(encode(mark, "png"), "image/png"));

        OrganizationLogo stored = storedLogo();
        assertEquals("image/png", stored.getContentType());
        BufferedImage logo = ImageIO.read(new ByteArrayInputStream(stored.getContent()));
        assertEquals(100, logo.getWidth());
        assertEquals(0, new Color(logo.getRGB(0, 0), true).getAlpha(), "transparent pixels stay transparent");
    }

    @Test
    void aJpegUploadIsAccepted() throws IOException {
        editable();
        BufferedImage photo = new BufferedImage(300, 400, BufferedImage.TYPE_INT_RGB);

        service.replace(USER_ID, ORG_ID, upload(encode(photo, "jpeg"), "image/jpeg"));

        OrganizationLogo stored = storedLogo();
        assertEquals("image/jpeg", stored.getContentType());
        assertEquals(256, ImageIO.read(new ByteArrayInputStream(stored.getContent())).getWidth());
    }

    @Test
    void whatIsNotAPngOrJpegIsRefused() throws IOException {
        found();
        BufferedImage image = new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB);

        assertRefused("Upload a PNG or JPG image.", upload("<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes(), "image/svg+xml"));
        assertRefused("Upload a PNG or JPG image.", upload(encode(image, "gif"), "image/gif"));
        // The declared type is not trusted: the bytes are.
        assertRefused("Upload a PNG or JPG image.", upload("plain text".getBytes(), "image/png"));
        assertRefused("Upload a PNG or JPG image.", upload(new byte[0], "image/png"));
        verifyNoInteractions(logos);
        assertNull(organization.getLogoUpdatedAt());
    }

    @Test
    void tooSmallAndTooLargeUploadsAreRefused() throws IOException {
        found();
        BufferedImage tiny = new BufferedImage(40, 200, BufferedImage.TYPE_INT_RGB);

        assertRefused("The logo must be at least 64 by 64 pixels.", upload(encode(tiny, "png"), "image/png"));
        assertRefused("The logo must be at most 2 MB.", upload(new byte[2 * 1024 * 1024 + 1], "image/png"));
        verifyNoInteractions(logos);
    }

    @Test
    void replacingNeedsThePermissionToEditTheOrganization() {
        doThrow(new OrganizationAccessDeniedException(ORG_ID))
                .when(authorization).require(USER_ID, ORG_ID, PermissionKey.EDIT_ORGANIZATION);

        assertThrows(OrganizationAccessDeniedException.class,
                () -> service.replace(USER_ID, ORG_ID, upload(new byte[10], "image/png")));
        assertThrows(OrganizationAccessDeniedException.class, () -> service.remove(USER_ID, ORG_ID));

        verify(organizations, never()).findById(ORG_ID);
        verifyNoInteractions(logos);
    }

    @Test
    void removingDropsTheLogoAndItsAddress() {
        editable();
        organization.setLogoUpdatedAt(java.time.OffsetDateTime.parse("2026-10-01T10:00:00Z"));

        OrganizationDto result = service.remove(USER_ID, ORG_ID);

        verify(logos).deleteById(ORG_ID);
        assertNull(organization.getLogoUpdatedAt());
        assertNull(result.logoUrl());
    }

    @Test
    void readingNeedsNoSessionAndIsEmptyWithoutALogo() {
        when(logos.findById(ORG_ID)).thenReturn(Optional.empty());

        assertFalse(service.read(ORG_ID).isPresent());
        verifyNoInteractions(authorization, access);
    }

    private void found() {
        when(organizations.findById(ORG_ID)).thenReturn(Optional.of(organization));
    }

    private void editable() {
        found();
        when(organizations.save(organization)).thenReturn(organization);
        when(access.requireUser(USER_ID)).thenReturn(user(USER_ID));
    }

    private OrganizationLogo storedLogo() {
        ArgumentCaptor<OrganizationLogo> captor = ArgumentCaptor.forClass(OrganizationLogo.class);
        verify(logos).save(captor.capture());
        assertEquals(ORG_ID, captor.getValue().getOrganizationId());
        assertEquals(organization.getLogoUpdatedAt(), captor.getValue().getUpdatedAt());
        return captor.getValue();
    }

    private void assertRefused(String reason, MockMultipartFile upload) {
        ResponseStatusException refused = assertThrows(ResponseStatusException.class,
                () -> service.replace(USER_ID, ORG_ID, upload));
        assertEquals(400, refused.getStatusCode().value());
        assertEquals(reason, refused.getReason());
    }

    private static MockMultipartFile upload(byte[] bytes, String contentType) {
        return new MockMultipartFile("logo", "logo", contentType, bytes);
    }

    private static byte[] encode(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(image, format, output));
        return output.toByteArray();
    }
}

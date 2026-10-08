package dev.ulloasp.mlsuite.organization.application.usecase;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Set;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Turns an uploaded picture into the logo that is stored: the centered square of it, at most
 * {@value #SIDE} pixels wide, since it is shown at a few dozen. It is kept lossless as PNG: a
 * logo is flat colour and sharp edges, which JPEG blurs into visible artifacts.
 */
public final class OrganizationLogoImage {

    public static final int SIDE = 256;
    public static final int MIN_SIDE = 64;
    public static final long MAX_UPLOAD_BYTES = 2L * 1024 * 1024;
    /** Checked before decoding: a small file may still describe an image too large to hold. */
    private static final long MAX_PIXELS = 25_000_000L;
    private static final Set<String> FORMATS = Set.of("png", "jpeg");

    private OrganizationLogoImage() {
    }

    public record Normalized(byte[] content, String contentType) {
    }

    public static Normalized normalize(byte[] upload) {
        if (upload.length > MAX_UPLOAD_BYTES) throw invalid("The logo must be at most 2 MB.");
        BufferedImage source = decode(upload);
        int side = Math.min(source.getWidth(), source.getHeight());
        if (side < MIN_SIDE) {
            throw invalid("The logo must be at least %d by %d pixels.".formatted(MIN_SIDE, MIN_SIDE));
        }
        boolean alpha = source.getColorModel().hasAlpha();
        BufferedImage square = source.getSubimage(
                (source.getWidth() - side) / 2, (source.getHeight() - side) / 2, side, side);
        BufferedImage logo = scale(square, Math.min(side, SIDE), alpha);
        return new Normalized(encodePng(logo), "image/png");
    }

    private static BufferedImage decode(byte[] upload) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(upload))) {
            Iterator<ImageReader> readers = input == null ? null : ImageIO.getImageReaders(input);
            if (readers == null || !readers.hasNext()) throw invalid("Upload a PNG or JPG image.");
            ImageReader reader = readers.next();
            try {
                if (!FORMATS.contains(reader.getFormatName().toLowerCase())) {
                    throw invalid("Upload a PNG or JPG image.");
                }
                reader.setInput(input);
                if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_PIXELS) {
                    throw invalid("The logo has too many pixels to be read.");
                }
                BufferedImage image = reader.read(0);
                if (image == null) throw invalid("The image could not be read.");
                return image;
            } finally {
                reader.dispose();
            }
        } catch (ResponseStatusException refusal) {
            throw refusal;
        } catch (IOException | RuntimeException failure) {
            throw invalid("The image could not be read.");
        }
    }

    /** Halves until close, then interpolates: one long jump from a large picture leaves aliasing. */
    private static BufferedImage scale(BufferedImage image, int target, boolean alpha) {
        BufferedImage current = image;
        while (current.getWidth() / 2 >= target) {
            current = draw(current, current.getWidth() / 2, alpha);
        }
        boolean done = current.getWidth() == target && current.getType() == type(alpha);
        return done ? current : draw(current, target, alpha);
    }

    private static BufferedImage draw(BufferedImage image, int side, boolean alpha) {
        BufferedImage target = new BufferedImage(side, side, type(alpha));
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(image, 0, 0, side, side, null);
        } finally {
            graphics.dispose();
        }
        return target;
    }

    private static int type(boolean alpha) {
        return alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
    }

    private static byte[] encodePng(BufferedImage image) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        } catch (IOException failure) {
            throw new IllegalStateException("PNG encoding failed", failure);
        }
    }

    private static ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}

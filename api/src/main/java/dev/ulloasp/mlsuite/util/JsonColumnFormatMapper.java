package dev.ulloasp.mlsuite.util;

import java.lang.reflect.Type;

import org.hibernate.type.format.AbstractJsonFormatMapper;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Reads and writes the JSON columns with Jackson 3, which Hibernate 7.2 cannot. Jackson 2's
 * defaults, as Hibernate's own mapper had them, keep what is stored as it was written before.
 */
public class JsonColumnFormatMapper extends AbstractJsonFormatMapper {

    private final JsonMapper mapper = JsonMapper.builderWithJackson2Defaults().build();

    @Override
    protected <T> T fromString(CharSequence json, Type type) {
        try {
            return mapper.readValue(json.toString(), mapper.constructType(type));
        } catch (JacksonException ex) {
            throw new IllegalArgumentException("Could not deserialize string to java type: " + type, ex);
        }
    }

    @Override
    protected <T> String toString(T value, Type type) {
        try {
            return mapper.writerFor(mapper.constructType(type)).writeValueAsString(value);
        } catch (JacksonException ex) {
            throw new IllegalArgumentException("Could not serialize object of java type: " + type, ex);
        }
    }
}

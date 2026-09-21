package dev.ulloasp.mlsuite.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

import dev.ulloasp.mlsuite.model.domain.model.Model;
import dev.ulloasp.mlsuite.user.domain.model.SystemRole;
import dev.ulloasp.mlsuite.user.domain.model.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.RollbackException;

@DataJpaTest(properties = {
        "logging.file.name=target/model-lock-test.log",
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.url=jdbc:h2:mem:model-lock;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;"
                + "INIT=CREATE DOMAIN IF NOT EXISTS TIMESTAMPTZ AS TIMESTAMP WITH TIME ZONE"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ActiveProfiles("test")
@ContextConfiguration(classes = ModelOptimisticLockTest.PersistenceConfig.class)
class ModelOptimisticLockTest {

    @Configuration
    @EntityScan("dev.ulloasp.mlsuite")
    @EnableJpaRepositories("dev.ulloasp.mlsuite")
    static class PersistenceConfig {
    }

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void rejectsAStaleConcurrentModelUpdate() {
        Long modelId = createModel();
        EntityManager first = entityManagerFactory.createEntityManager();
        EntityManager second = entityManagerFactory.createEntityManager();
        try {
            first.getTransaction().begin();
            second.getTransaction().begin();
            Model firstCopy = first.find(Model.class, modelId);
            Model staleCopy = second.find(Model.class, modelId);

            firstCopy.setName("first-write");
            first.getTransaction().commit();

            staleCopy.setName("stale-write");
            assertThrows(RollbackException.class, () -> second.getTransaction().commit());

            EntityManager verifier = entityManagerFactory.createEntityManager();
            try {
                assertEquals("first-write", verifier.find(Model.class, modelId).getName());
            } finally {
                verifier.close();
            }
        } finally {
            rollbackIfActive(first);
            rollbackIfActive(second);
            first.close();
            second.close();
        }
    }

    private Long createModel() {
        EntityManager entityManager = entityManagerFactory.createEntityManager();
        try {
            entityManager.getTransaction().begin();
            User owner = new User("owner", "owner@example.test", "hash", "Owner", SystemRole.USER);
            entityManager.persist(owner);
            Model model = new Model(owner, "original", "classifier", "test", "model.bin", new byte[] {1});
            model.setInputSchema(Map.of());
            entityManager.persist(model);
            entityManager.getTransaction().commit();
            return model.getId();
        } finally {
            rollbackIfActive(entityManager);
            entityManager.close();
        }
    }

    private void rollbackIfActive(EntityManager entityManager) {
        if (entityManager.getTransaction().isActive()) {
            entityManager.getTransaction().rollback();
        }
    }
}

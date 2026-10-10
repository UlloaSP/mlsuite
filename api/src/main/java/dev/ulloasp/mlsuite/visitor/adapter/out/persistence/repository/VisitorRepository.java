package dev.ulloasp.mlsuite.visitor.adapter.out.persistence.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import dev.ulloasp.mlsuite.visitor.domain.model.Visitor;

public interface VisitorRepository extends JpaRepository<Visitor, UUID> {
}

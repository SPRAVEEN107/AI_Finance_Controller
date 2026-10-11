package com.example.backend.repository;

import com.example.backend.model.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    Optional<Settlement> findBySettlementId(String settlementId);
    Optional<Settlement> findByReference(String reference);
}

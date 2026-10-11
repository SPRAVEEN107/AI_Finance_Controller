package com.example.backend.repository;

import com.example.backend.model.GroundTruth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroundTruthRepository extends JpaRepository<GroundTruth, Long> {
    Optional<GroundTruth> findByTransactionId(String transactionId);
}

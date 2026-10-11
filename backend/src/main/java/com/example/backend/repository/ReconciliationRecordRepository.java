package com.example.backend.repository;

import com.example.backend.model.ReconciliationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReconciliationRecordRepository extends JpaRepository<ReconciliationRecord, Long> {
    Optional<ReconciliationRecord> findByTransactionId(String transactionId);
    List<ReconciliationRecord> findByStatus(String status);
    List<ReconciliationRecord> findByExceptionType(String exceptionType);
}

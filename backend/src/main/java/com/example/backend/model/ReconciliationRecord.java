package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reconciliation_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReconciliationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String transactionId;
    private String paymentId;
    private String invoiceId;
    private String settlementId;

    private Double matchScore; // 0.0 to 100.0
    private String status;     // MATCHED, REVIEW, EXCEPTION
    private String exceptionType; // NONE, AMOUNT_MISMATCH, MISSING_PAYMENT, MISSING_INVOICE, DUPLICATE, SETTLEMENT_FEE_DIFFERENCE

    @Column(length = 2000)
    private String explanation;

    private LocalDateTime matchedAt;
}

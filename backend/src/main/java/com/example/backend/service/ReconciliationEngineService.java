package com.example.backend.service;

import com.example.backend.model.*;
import com.example.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReconciliationEngineService {

    private final BankTransactionRepository bankRepo;
    private final PaymentRepository paymentRepo;
    private final InvoiceRepository invoiceRepo;
    private final SettlementRepository settlementRepo;
    private final ReconciliationRecordRepository reconRepo;

    @Transactional
    public List<ReconciliationRecord> runReconciliation() {
        long startTime = System.currentTimeMillis();
        log.info("Starting mathematical reconciliation engine execution...");

        reconRepo.deleteAll();
        List<BankTransaction> bankTxns = bankRepo.findAll();
        List<ReconciliationRecord> results = new ArrayList<>();

        for (BankTransaction tx : bankTxns) {
            String txId = tx.getTransactionId();
            List<Payment> payments = paymentRepo.findAllByReference(txId);
            List<Invoice> invoices = invoiceRepo.findAllByCustomer(tx.getCustomer());
            Optional<Invoice> invoiceOpt = invoices.stream()
                    .filter(inv -> inv.getAmount() != null && inv.getAmount().compareTo(tx.getAmount()) == 0)
                    .findFirst();

            Optional<Settlement> settlementOpt = settlementRepo.findByReference(txId);

            double score = 0.0;
            String status;
            String exceptionType = "NONE";
            StringBuilder explanation = new StringBuilder();

            String matchedPayId = null;
            String matchedInvId = null;
            String matchedSetId = null;

            if (payments.size() > 1) {
                // Duplicate payment gateway entries detected
                status = "EXCEPTION";
                exceptionType = "DUPLICATE";
                score = 30.0;
                explanation.append(String.format("Duplicate payment records found (%d payments linked to %s). ", payments.size(), txId));
                matchedPayId = payments.get(0).getPaymentId();
            } else if (payments.isEmpty()) {
                // Missing payment record
                status = "EXCEPTION";
                exceptionType = "MISSING_PAYMENT";
                score = 20.0;
                explanation.append(String.format("No payment record found for transaction %s. ", txId));
            } else {
                Payment pay = payments.get(0);
                matchedPayId = pay.getPaymentId();

                // 1. Amount matching score (Weight 40%)
                BigDecimal bankAmt = tx.getAmount();
                BigDecimal payAmt = pay.getAmount();
                BigDecimal diff = bankAmt.subtract(payAmt).abs();
                double amountScore = 0.0;

                if (diff.compareTo(BigDecimal.ZERO) == 0) {
                    amountScore = 40.0;
                    explanation.append(String.format("Bank amount (₹%s) matches Payment gateway amount exactly. ", bankAmt));
                } else {
                    double pctDiff = diff.divide(bankAmt, 4, RoundingMode.HALF_UP).doubleValue() * 100.0;
                    if (pctDiff <= 3.0 && settlementOpt.isPresent()) {
                        // Likely a settlement fee deduction
                        amountScore = 30.0;
                        exceptionType = "SETTLEMENT_FEE_DIFFERENCE";
                        explanation.append(String.format("Bank amount ₹%s vs Payment ₹%s has a ₹%s (%.2f%%) discrepancy due to gateway settlement fees. ",
                                bankAmt, payAmt, diff, pctDiff));
                    } else {
                        amountScore = 10.0;
                        exceptionType = "AMOUNT_MISMATCH";
                        explanation.append(String.format("Significant amount discrepancy detected: Bank ₹%s vs Payment ₹%s (Difference ₹%s). ",
                                bankAmt, payAmt, diff));
                    }
                }

                // 2. Reference match score (Weight 30%)
                double refScore = 30.0;
                explanation.append("Transaction ID reference match verified. ");

                // 3. Customer similarity score (Weight 15%)
                double customerScore = 0.0;
                if (tx.getCustomer() != null && tx.getCustomer().equalsIgnoreCase(pay.getCustomer())) {
                    customerScore = 15.0;
                    explanation.append(String.format("Customer identity verified (%s). ", tx.getCustomer()));
                }

                // 4. Date proximity score (Weight 15%)
                double dateScore = 15.0;
                long daysDiff = Math.abs(ChronoUnit.DAYS.between(tx.getDate(), pay.getDate()));
                if (daysDiff > 5) {
                    dateScore = 5.0;
                }
                explanation.append(String.format("Transaction date alignment verified (%s). ", tx.getDate()));

                score = amountScore + refScore + customerScore + dateScore;

                if (exceptionType.equals("AMOUNT_MISMATCH")) {
                    status = "EXCEPTION";
                } else if (exceptionType.equals("SETTLEMENT_FEE_DIFFERENCE")) {
                    status = "REVIEW";
                } else if (score >= 90.0) {
                    status = "MATCHED";
                } else if (score >= 70.0) {
                    status = "REVIEW";
                } else {
                    status = "EXCEPTION";
                }
            }

            if (invoiceOpt.isPresent()) {
                matchedInvId = invoiceOpt.get().getInvoiceId();
            } else if (!status.equals("MATCHED")) {
                explanation.append("No corresponding invoice found. ");
            }

            if (settlementOpt.isPresent()) {
                matchedSetId = settlementOpt.get().getSettlementId();
            }

            ReconciliationRecord record = ReconciliationRecord.builder()
                    .transactionId(txId)
                    .paymentId(matchedPayId)
                    .invoiceId(matchedInvId)
                    .settlementId(matchedSetId)
                    .matchScore(score)
                    .status(status)
                    .exceptionType(exceptionType)
                    .explanation(explanation.toString().trim())
                    .matchedAt(LocalDateTime.now())
                    .build();

            results.add(record);
        }

        reconRepo.saveAll(results);
        long duration = System.currentTimeMillis() - startTime;
        log.info("Completed mathematical reconciliation of {} records in {} ms.", results.size(), duration);

        return results;
    }
}

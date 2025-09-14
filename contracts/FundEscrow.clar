(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PROPOSAL-ID u101)
(define-constant ERR-INVALID-AMOUNT u102)
(define-constant ERR-INVALID-VENDOR u103)
(define-constant ERR-ESCROW-ALREADY-EXISTS u104)
(define-constant ERR-ESCROW-NOT-FOUND u105)
(define-constant ERR-INVALID-TIMESTAMP u106)
(define-constant ERR-FUNDS-LOCKED u107)
(define-constant ERR-FUNDS-RELEASED u108)
(define-constant ERR-VERIFICATION-FAILED u109)
(define-constant ERR-INVALID-VERIFIER u110)
(define-constant ERR-INSUFFICIENT-BALANCE u111)
(define-constant ERR-TRANSFER-FAILED u112)
(define-constant ERR-INVALID-STATUS u113)
(define-constant ERR-EXPIRED-ESCROW u114)
(define-constant ERR-INVALID-QUORUM u115)
(define-constant ERR-INVALID-DEADLINE u116)
(define-constant ERR-INVALID-DESCRIPTION u117)
(define-constant ERR-MAX-ESCROWS-EXCEEDED u118)
(define-constant ERR-INVALID-UPDATE-PARAM u119)
(define-constant ERR-UPDATE-NOT-ALLOWED u120)
(define-constant ERR-INVALID-REFUND-REASON u121)
(define-constant ERR-INVALID-VERIFICATION-METHOD u122)
(define-constant ERR-INVALID-MULTISIG-COUNT u123)
(define-constant ERR-INVALID-ORACLE u124)

(define-data-var next-escrow-id uint u0)
(define-data-var max-escrows uint u1000)
(define-data-var escrow-fee uint u500)
(define-data-var admin-principal principal tx-sender)

(define-map escrows
  uint
  {
    proposal-id: uint,
    amount: uint,
    vendor: principal,
    locked-at: uint,
    deadline: uint,
    status: (string-ascii 20),
    verifier: (optional principal),
    quorum: uint,
    description: (string-utf8 200),
    verification-method: (string-ascii 50),
    multisig-count: uint,
    oracle: (optional principal),
    refund-reason: (optional (string-utf8 100))
  }
)

(define-map escrow-updates
  uint
  {
    update-amount: uint,
    update-deadline: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-escrow (id uint))
  (map-get? escrows id)
)

(define-read-only (get-escrow-updates (id uint))
  (map-get? escrow-updates id)
)

(define-private (validate-proposal-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-PROPOSAL-ID))
)

(define-private (validate-amount (amt uint))
  (if (> amt u0)
      (ok true)
      (err ERR-INVALID-AMOUNT))
)

(define-private (validate-vendor (v principal))
  (if (not (is-eq v tx-sender))
      (ok true)
      (err ERR-INVALID-VENDOR))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-deadline (dl uint))
  (if (> dl block-height)
      (ok true)
      (err ERR-INVALID-DEADLINE))
)

(define-private (validate-status (st (string-ascii 20)))
  (if (or (is-eq st "locked") (is-eq st "released") (is-eq st "refunded"))
      (ok true)
      (err ERR-INVALID-STATUS))
)

(define-private (validate-quorum (q uint))
  (if (and (> q u0) (<= q u100))
      (ok true)
      (err ERR-INVALID-QUORUM))
)

(define-private (validate-description (desc (string-utf8 200)))
  (if (and (> (len desc) u0) (<= (len desc) u200))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-verification-method (method (string-ascii 50)))
  (if (or (is-eq method "oracle") (is-eq method "multisig") (is-eq method "vote"))
      (ok true)
      (err ERR-INVALID-VERIFICATION-METHOD))
)

(define-private (validate-multisig-count (count uint))
  (if (and (> count u1) (<= count u10))
      (ok true)
      (err ERR-INVALID-MULTISIG-COUNT))
)

(define-private (validate-oracle (o principal))
  (if (not (is-eq o tx-sender))
      (ok true)
      (err ERR-INVALID-ORACLE))
)

(define-private (validate-refund-reason (reason (string-utf8 100)))
  (if (and (> (len reason) u0) (<= (len reason) u100))
      (ok true)
      (err ERR-INVALID-REFUND-REASON))
)

(define-public (set-admin-principal (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (var-set admin-principal new-admin)
    (ok true)
  )
)

(define-public (set-max-escrows (new-max uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (var-set max-escrows new-max)
    (ok true)
  )
)

(define-public (set-escrow-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (var-set escrow-fee new-fee)
    (ok true)
  )
)

(define-public (create-escrow
  (proposal-id uint)
  (amount uint)
  (vendor principal)
  (deadline uint)
  (quorum uint)
  (description (string-utf8 200))
  (verification-method (string-ascii 50))
  (multisig-count uint)
  (oracle principal)
)
  (let (
        (next-id (var-get next-escrow-id))
        (current-max (var-get max-escrows))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-ESCROWS-EXCEEDED))
    (try! (validate-proposal-id proposal-id))
    (try! (validate-amount amount))
    (try! (validate-vendor vendor))
    (try! (validate-deadline deadline))
    (try! (validate-quorum quorum))
    (try! (validate-description description))
    (try! (validate-verification-method verification-method))
    (try! (validate-multisig-count multisig-count))
    (try! (validate-oracle oracle))
    (try! (stx-transfer? (var-get escrow-fee) tx-sender (var-get admin-principal)))
    (try! (stx-transfer? amount tx-sender contract-caller))
    (map-set escrows next-id
      {
        proposal-id: proposal-id,
        amount: amount,
        vendor: vendor,
        locked-at: block-height,
        deadline: deadline,
        status: "locked",
        verifier: none,
        quorum: quorum,
        description: description,
        verification-method: verification-method,
        multisig-count: multisig-count,
        oracle: (some oracle),
        refund-reason: none
      }
    )
    (var-set next-escrow-id (+ next-id u1))
    (print { event: "escrow-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-escrow
  (escrow-id uint)
  (update-amount uint)
  (update-deadline uint)
)
  (let ((escrow (map-get? escrows escrow-id)))
    (match escrow
      e
        (begin
          (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
          (try! (validate-amount update-amount))
          (try! (validate-deadline update-deadline))
          (asserts! (is-eq (get status e) "locked") (err ERR-UPDATE-NOT-ALLOWED))
          (map-set escrows escrow-id
            (merge e {
              amount: update-amount,
              deadline: update-deadline
            })
          )
          (map-set escrow-updates escrow-id
            {
              update-amount: update-amount,
              update-deadline: update-deadline,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "escrow-updated", id: escrow-id })
          (ok true)
        )
      (err ERR-ESCROW-NOT-FOUND)
    )
  )
)

(define-public (verify-and-release (escrow-id uint) (verified bool))
  (let ((escrow (map-get? escrows escrow-id)))
    (match escrow
      e
        (begin
          (asserts! (is-eq (get status e) "locked") (err ERR-FUNDS-RELEASED))
          (asserts! (< block-height (get deadline e)) (err ERR-EXPIRED-ESCROW))
          (asserts! verified (err ERR-VERIFICATION-FAILED))
          (try! (as-contract (stx-transfer? (get amount e) tx-sender (get vendor e))))
          (map-set escrows escrow-id
            (merge e { status: "released" })
          )
          (print { event: "funds-released", id: escrow-id })
          (ok true)
        )
      (err ERR-ESCROW-NOT-FOUND)
    )
  )
)

(define-public (refund-escrow (escrow-id uint) (reason (string-utf8 100)))
  (let ((escrow (map-get? escrows escrow-id)))
    (match escrow
      e
        (begin
          (asserts! (is-eq tx-sender (var-get admin-principal)) (err ERR-NOT-AUTHORIZED))
          (asserts! (is-eq (get status e) "locked") (err ERR-FUNDS-RELEASED))
          (try! (validate-refund-reason reason))
          (try! (as-contract (stx-transfer? (get amount e) tx-sender (contract-call? .contribution-manager get-fund-address))))
          (map-set escrows escrow-id
            (merge e { status: "refunded", refund-reason: (some reason) })
          )
          (print { event: "escrow-refunded", id: escrow-id })
          (ok true)
        )
      (err ERR-ESCROW-NOT-FOUND)
    )
  )
)

(define-public (get-escrow-count)
  (ok (var-get next-escrow-id))
)
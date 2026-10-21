"""Validate the actual additive SQLite migration against an existing reservation."""
import sqlite3
import unittest
from pathlib import Path

MIGRATION = (Path(__file__).resolve().parents[1] / "backend/prisma/migrations/20261021120000_booking_email_outbox/migration.sql").read_text()

class EmailMigrationTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys=ON")
        self.db.executescript("""
            CREATE TABLE bookings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              bookingNumber TEXT NOT NULL UNIQUE,
              totalPrice REAL NOT NULL
            );
            INSERT INTO bookings(bookingNumber,totalPrice) VALUES('EXISTING-RESERVATION',250);
        """)
        self.db.executescript(MIGRATION)

    def tearDown(self):
        self.db.close()

    def test_existing_booking_and_recorded_total_survive(self):
        self.assertEqual(self.db.execute("SELECT bookingNumber,totalPrice,checkoutKey FROM bookings").fetchone(),
                         ("EXISTING-RESERVATION", 250, None))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM booking_email_deliveries").fetchone()[0], 0)

    def test_unique_checkout_and_independent_recipient_jobs(self):
        self.db.execute("UPDATE bookings SET checkoutKey='cs_test:1' WHERE id=1")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO bookings(bookingNumber,totalPrice,checkoutKey) VALUES('DUPLICATE',250,'cs_test:1')")
        for recipient in ("GUEST", "HOTEL"):
            self.db.execute("""INSERT INTO booking_email_deliveries
                (bookingId,recipientType,recipientEmail,payloadJson) VALUES (1,?,?,?)""",
                (recipient, recipient.lower() + "@example.test", "{}"))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM booking_email_deliveries").fetchone()[0], 2)
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("""INSERT INTO booking_email_deliveries
                (bookingId,recipientType,recipientEmail,payloadJson) VALUES (1,'HOTEL','hotel@example.test','{}')""")

    def test_booking_and_delivery_job_commit_is_atomic(self):
        self.db.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            with self.db:
                self.db.execute("INSERT INTO bookings(bookingNumber,totalPrice) VALUES('ROLLBACK',100)")
                self.db.execute("""INSERT INTO booking_email_deliveries
                    (bookingId,recipientType,recipientEmail,payloadJson) VALUES (999,'HOTEL','hotel@example.test','{}')""")
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM bookings WHERE bookingNumber='ROLLBACK'").fetchone()[0], 0)

if __name__ == "__main__":
    unittest.main()

-- Add corrected_diagnosis field to doctor_feedback for the retraining loop
ALTER TABLE doctor_feedback
    ADD COLUMN corrected_diagnosis TEXT;

-- Index to quickly fetch all feedbacks for a given AI session (used by retrain endpoint)
CREATE INDEX idx_feedback_session ON doctor_feedback(ai_session_id)
    WHERE ai_session_id IS NOT NULL;

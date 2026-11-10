CREATE TABLE vendors (
	id UUID NOT NULL, 
	vendor_code VARCHAR(50) NOT NULL, 
	legal_name VARCHAR(255) NOT NULL, 
	normalised_name VARCHAR(255) NOT NULL, 
	tax_id VARCHAR(50), 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_vendors_vendor_code ON vendors (vendor_code);

CREATE UNIQUE INDEX ix_vendors_tax_id ON vendors (tax_id);

CREATE INDEX ix_vendors_normalised_name ON vendors (normalised_name);

CREATE TABLE purchase_orders (
	id UUID NOT NULL, 
	po_number VARCHAR(50) NOT NULL, 
	vendor_id UUID NOT NULL, 
	currency VARCHAR(10) NOT NULL, 
	po_total NUMERIC(15, 2) NOT NULL, 
	po_date DATE NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	description TEXT, 
	line_items JSON, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id)
);

CREATE INDEX ix_purchase_orders_status ON purchase_orders (status);

CREATE INDEX ix_purchase_orders_vendor_id ON purchase_orders (vendor_id);

CREATE UNIQUE INDEX ix_purchase_orders_po_number ON purchase_orders (po_number);

CREATE TABLE invoice_runs (
	id UUID NOT NULL, 
	original_filename VARCHAR(255) NOT NULL, 
	file_storage_path VARCHAR(500) NOT NULL, 
	file_sha256 VARCHAR(64) NOT NULL, 
	file_size_bytes INTEGER NOT NULL, 
	processing_state VARCHAR(20) NOT NULL, 
	decision_status VARCHAR(30), 
	vendor_id UUID, 
	purchase_order_id UUID, 
	invoice_number VARCHAR(255), 
	invoice_number_normalised VARCHAR(255), 
	invoice_date DATE, 
	currency VARCHAR(10), 
	grand_total NUMERIC(15, 2), 
	extracted_data JSON, 
	decision_summary TEXT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(vendor_id) REFERENCES vendors (id), 
	FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders (id)
);

CREATE INDEX ix_invoice_runs_invoice_number_normalised ON invoice_runs (invoice_number_normalised);

CREATE INDEX ix_invoice_runs_decision_status ON invoice_runs (decision_status);

CREATE INDEX ix_invoice_runs_vendor_id ON invoice_runs (vendor_id);

CREATE INDEX ix_invoice_runs_file_sha256 ON invoice_runs (file_sha256);

CREATE INDEX ix_invoice_runs_purchase_order_id ON invoice_runs (purchase_order_id);

CREATE INDEX ix_invoice_runs_created_at ON invoice_runs (created_at);

CREATE INDEX ix_invoice_runs_processing_state ON invoice_runs (processing_state);

CREATE TABLE invoice_decisions (
	id UUID NOT NULL, 
	run_id UUID NOT NULL, 
	status VARCHAR(30) NOT NULL, 
	reason_codes JSON NOT NULL, 
	summary TEXT NOT NULL, 
	recommended_action VARCHAR(255) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES invoice_runs (id)
);

CREATE UNIQUE INDEX ix_invoice_decisions_run_id ON invoice_decisions (run_id);

CREATE TABLE review_events (
	id UUID NOT NULL, 
	run_id UUID NOT NULL, 
	action VARCHAR(30) NOT NULL, 
	reviewer_label VARCHAR(100) NOT NULL, 
	reason TEXT NOT NULL, 
	metadata JSON, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES invoice_runs (id)
);

CREATE INDEX ix_review_events_run_id ON review_events (run_id);

CREATE TABLE rule_results (
	id UUID NOT NULL, 
	run_id UUID NOT NULL, 
	rule_id VARCHAR(10) NOT NULL, 
	rule_name VARCHAR(100) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	severity VARCHAR(10) NOT NULL, 
	actual_value JSON, 
	expected_value JSON, 
	message TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES invoice_runs (id)
);

CREATE INDEX ix_rule_results_run_id ON rule_results (run_id);

CREATE TABLE run_stages (
	id UUID NOT NULL, 
	run_id UUID NOT NULL, 
	stage_key VARCHAR(50) NOT NULL, 
	display_name VARCHAR(100) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	sequence INTEGER NOT NULL, 
	started_at TIMESTAMP WITH TIME ZONE, 
	completed_at TIMESTAMP WITH TIME ZONE, 
	duration_ms INTEGER, 
	summary TEXT, 
	details JSON, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES invoice_runs (id)
);

CREATE INDEX ix_run_stages_run_id ON run_stages (run_id);
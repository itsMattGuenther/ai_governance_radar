-- Schema of the public site's database before regulation milestones (T-043), taken
-- from the radar-data snapshot of 2026-11-25. tests/test_milestones.py upgrades it.
CREATE TABLE sources (
	id INTEGER NOT NULL,
	name VARCHAR(200) NOT NULL,
	url VARCHAR(1000) NOT NULL,
	feed_url VARCHAR(1000),
	source_type VARCHAR(20) NOT NULL,
	category_default VARCHAR(40),
	jurisdiction_code VARCHAR(20),
	reliability_tier INTEGER NOT NULL,
	polling_interval_minutes INTEGER NOT NULL,
	enabled BOOLEAN NOT NULL,
	attribution TEXT,
	last_success_at DATETIME,
	last_failure_at DATETIME,
	last_error TEXT,
	http_etag VARCHAR(400),
	http_last_modified VARCHAR(100),
	page_hash VARCHAR(64),
	config JSON,
	is_demo BOOLEAN NOT NULL,
	created_at DATETIME NOT NULL,
	updated_at DATETIME NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (name)
);
CREATE TABLE item_clusters (
	id INTEGER NOT NULL,
	primary_item_id INTEGER,
	title VARCHAR(500) NOT NULL,
	created_at DATETIME NOT NULL,
	PRIMARY KEY (id)
);
CREATE TABLE entities (
	id INTEGER NOT NULL,
	slug VARCHAR(120) NOT NULL,
	name VARCHAR(300) NOT NULL,
	entity_type VARCHAR(20) NOT NULL,
	jurisdiction_code VARCHAR(20),
	description TEXT,
	official_url VARCHAR(1000),
	current_status VARCHAR(40),
	needs_review BOOLEAN NOT NULL,
	is_demo BOOLEAN NOT NULL,
	meta JSON,
	created_at DATETIME NOT NULL,
	updated_at DATETIME NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (slug)
);
CREATE TABLE incidents (
	id INTEGER NOT NULL,
	title VARCHAR(400) NOT NULL,
	occurred_at DATETIME,
	reported_at DATETIME NOT NULL,
	severity VARCHAR(10) NOT NULL,
	category VARCHAR(40) NOT NULL,
	system_vendor VARCHAR(200),
	system_type VARCHAR(200),
	geography VARCHAR(100),
	affected_domain VARCHAR(200),
	what_happened TEXT NOT NULL,
	root_cause TEXT,
	governance_relevance TEXT,
	security_relevance TEXT,
	mitigation TEXT,
	fact_status VARCHAR(30) NOT NULL,
	confidence VARCHAR(10) NOT NULL,
	related_framework_slugs JSON NOT NULL,
	source_links JSON NOT NULL,
	is_demo BOOLEAN NOT NULL,
	created_at DATETIME NOT NULL,
	updated_at DATETIME NOT NULL,
	PRIMARY KEY (id)
);
CREATE TABLE app_state (
	"key" VARCHAR(80) NOT NULL,
	value JSON,
	updated_at DATETIME NOT NULL,
	PRIMARY KEY ("key")
);
CREATE TABLE source_runs (
	id INTEGER NOT NULL,
	source_id INTEGER NOT NULL,
	started_at DATETIME NOT NULL,
	finished_at DATETIME,
	status VARCHAR(10) NOT NULL,
	items_found INTEGER NOT NULL,
	items_new INTEGER NOT NULL,
	items_updated INTEGER NOT NULL,
	http_status INTEGER,
	error_message TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY(source_id) REFERENCES sources (id)
);
CREATE TABLE items (
	id INTEGER NOT NULL,
	source_id INTEGER NOT NULL,
	url VARCHAR(1000) NOT NULL,
	canonical_url VARCHAR(1000) NOT NULL,
	content_hash VARCHAR(64) NOT NULL,
	title VARCHAR(500) NOT NULL,
	excerpt TEXT,
	published_at DATETIME,
	first_seen_at DATETIME NOT NULL,
	last_seen_at DATETIME NOT NULL,
	categories JSON NOT NULL,
	jurisdiction_code VARCHAR(20),
	change_type VARCHAR(30),
	impact_score INTEGER NOT NULL,
	impact_factors JSON NOT NULL,
	confidence VARCHAR(10) NOT NULL,
	fact_status VARCHAR(30),
	cluster_id INTEGER,
	is_demo BOOLEAN NOT NULL,
	raw_metadata JSON,
	created_at DATETIME NOT NULL,
	updated_at DATETIME NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_item_source_url UNIQUE (source_id, canonical_url),
	FOREIGN KEY(source_id) REFERENCES sources (id),
	FOREIGN KEY(cluster_id) REFERENCES item_clusters (id)
);
CREATE TABLE regulations (
	entity_id INTEGER NOT NULL,
	government_level VARCHAR(20) NOT NULL,
	status VARCHAR(20) NOT NULL,
	status_label VARCHAR(60),
	introduced_at DATETIME,
	passed_at DATETIME,
	signed_at DATETIME,
	effective_at DATETIME,
	compliance_deadline DATETIME,
	last_amended_at DATETIME,
	enforcement_authority VARCHAR(300),
	penalties TEXT,
	covered_entities TEXT,
	risk_classification VARCHAR(200),
	applicability_notes TEXT,
	official_source_url VARCHAR(1000) NOT NULL,
	confidence VARCHAR(10) NOT NULL,
	last_verified_at DATETIME NOT NULL,
	PRIMARY KEY (entity_id),
	FOREIGN KEY(entity_id) REFERENCES entities (id)
);
CREATE TABLE standards (
	entity_id INTEGER NOT NULL,
	publisher VARCHAR(60) NOT NULL,
	version VARCHAR(60),
	status VARCHAR(20) NOT NULL,
	published_at DATETIME,
	last_updated_at DATETIME,
	change_magnitude VARCHAR(12),
	related_framework_slugs JSON NOT NULL,
	official_source_url VARCHAR(1000) NOT NULL,
	PRIMARY KEY (entity_id),
	FOREIGN KEY(entity_id) REFERENCES entities (id)
);
CREATE TABLE entity_events (
	id INTEGER NOT NULL,
	entity_id INTEGER NOT NULL,
	event_type VARCHAR(30) NOT NULL,
	occurred_at DATETIME NOT NULL,
	previous_value VARCHAR(400),
	new_value VARCHAR(400),
	summary TEXT NOT NULL,
	evidence_item_id INTEGER,
	impact_score INTEGER,
	created_at DATETIME NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(entity_id) REFERENCES entities (id),
	FOREIGN KEY(evidence_item_id) REFERENCES items (id)
);
CREATE TABLE item_entities (
	item_id INTEGER NOT NULL,
	entity_id INTEGER NOT NULL,
	relation VARCHAR(12) NOT NULL,
	PRIMARY KEY (item_id, entity_id),
	FOREIGN KEY(item_id) REFERENCES items (id),
	FOREIGN KEY(entity_id) REFERENCES entities (id)
);
CREATE INDEX ix_entities_entity_type ON entities (entity_type);
CREATE INDEX ix_entities_jurisdiction_code ON entities (jurisdiction_code);
CREATE INDEX ix_incidents_category ON incidents (category);
CREATE INDEX ix_incidents_reported_at ON incidents (reported_at);
CREATE INDEX ix_incidents_severity ON incidents (severity);
CREATE INDEX ix_source_runs_source_id ON source_runs (source_id);
CREATE INDEX ix_items_published_at ON items (published_at);
CREATE INDEX ix_items_content_hash ON items (content_hash);
CREATE INDEX ix_items_canonical_url ON items (canonical_url);
CREATE INDEX ix_items_jurisdiction_code ON items (jurisdiction_code);
CREATE INDEX ix_items_cluster_id ON items (cluster_id);
CREATE INDEX ix_items_source_id ON items (source_id);
CREATE INDEX ix_regulations_status ON regulations (status);
CREATE INDEX ix_standards_publisher ON standards (publisher);
CREATE INDEX ix_standards_status ON standards (status);
CREATE INDEX ix_entity_events_entity_id ON entity_events (entity_id);
CREATE INDEX ix_entity_events_occurred_at ON entity_events (occurred_at);
CREATE VIRTUAL TABLE items_fts USING fts5(
    title, excerpt, entity_names, tokenize='porter unicode61'
);

-- Create the new table to link courses to multiple Kiwify products
CREATE TABLE course_kiwify_products (
    course_id BIGINT NOT NULL,
    kiwify_product_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (course_id, kiwify_product_id),
    CONSTRAINT fk_course
        FOREIGN KEY(course_id) 
        REFERENCES courses(id)
        ON DELETE CASCADE
);

-- Optional: Add a comment to describe the table's purpose
COMMENT ON TABLE course_kiwify_products IS 'Links a single course to multiple Kiwify product IDs.';

-- Migrate existing data from the courses table to the new linking table
-- This ensures no data is lost for existing courses.
INSERT INTO course_kiwify_products (course_id, kiwify_product_id)
SELECT id, kiwify_product_id
FROM courses
WHERE kiwify_product_id IS NOT NULL AND kiwify_product_id <> '';

-- Finally, remove the old column from the courses table
ALTER TABLE courses
DROP COLUMN kiwify_product_id;

WITH {stage} as s
MATCH (n)
SET n.stage =
	CASE WHEN n.stage IS NULL THEN [toInt(s.`stage`)] ELSE n.stage + toInt(s.`stage`)
	END

// TX-SPLIT -------------------------------

WITH {stage} as s
MATCH () -[l]- ()
WITH DISTINCT l, s
SET l.stage =
	CASE WHEN l.stage IS NULL THEN [toInt(s.`stage`)] ELSE l.stage + toInt(s.`stage`)
	END

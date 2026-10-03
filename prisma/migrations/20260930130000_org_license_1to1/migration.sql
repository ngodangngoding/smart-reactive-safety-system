-- License <-> Organization becomes 1:1: a license can be assigned to at most one organization.
CREATE UNIQUE INDEX "Organization_licenseId_key" ON "Organization"("licenseId");

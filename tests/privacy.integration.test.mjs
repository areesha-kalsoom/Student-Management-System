import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = (process.env.SMS_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);

async function call(path, { method = "GET", body, cookie } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: "manual" });
  const setCookie = response.headers.get("set-cookie");
  const nextCookie = setCookie?.split(";")[0] || cookie || "";
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, data, cookie: nextCookie };
}

function student(name, email) {
  return {
    name,
    rollNumber: "PRIVACY-001",
    dateOfBirth: "",
    gender: "Prefer not to say",
    email,
    phone: "",
    address: "",
    className: "Test cohort",
    department: "",
    enrollmentDate: new Date().toISOString().slice(0, 10),
    status: "active",
    notes: "Fictional test profile",
    customValues: {},
  };
}

test("two accounts remain isolated across records, fields, dashboard, export, and sessions", async (t) => {
  const password = "Privacy-Test-Only-Password-2026!";
  const emailA = `privacy-a-${suffix}@example.test`;
  const emailB = `privacy-b-${suffix}@example.test`;
  let cookieA = "";
  let cookieB = "";
  let cleanupCookieB = "";
  let accountAReady = false;
  let accountBReady = false;
  let studentAId = "";
  let fieldAId = "";

  t.after(async () => {
    if (accountAReady) await call("/api/account", { method: "DELETE", cookie: cookieA, body: { password, confirmation: "DELETE" } }).catch(() => undefined);
    if (accountBReady) await call("/api/account", { method: "DELETE", cookie: cleanupCookieB, body: { password, confirmation: "DELETE" } }).catch(() => undefined);
  });

  const registrationA = await call("/api/auth/register", { method: "POST", body: { name: "Privacy Test A", email: emailA, password, termsAccepted: true } });
  assert.equal(registrationA.response.status, 201, JSON.stringify(registrationA.data));
  cookieA = registrationA.cookie;
  accountAReady = true;

  const registrationB = await call("/api/auth/register", { method: "POST", body: { name: "Privacy Test B", email: emailB, password, termsAccepted: true } });
  assert.equal(registrationB.response.status, 201, JSON.stringify(registrationB.data));
  cookieB = registrationB.cookie;
  cleanupCookieB = cookieB;
  accountBReady = true;

  const createA = await call("/api/students", { method: "POST", cookie: cookieA, body: student("Private Learner Alpha", "shared-student@example.test") });
  assert.equal(createA.response.status, 201, JSON.stringify(createA.data));
  studentAId = createA.data.student.id;

  const createB = await call("/api/students", { method: "POST", cookie: cookieB, body: student("Private Learner Beta", emailB.replace("privacy-b", "student-b")) });
  assert.equal(createB.response.status, 201, JSON.stringify(createB.data));
  assert.equal(createB.data.student.rollNumber, "PRIVACY-001", "the same roll number is allowed in separate workspaces");

  const ownRead = await call(`/api/students/${studentAId}`, { cookie: cookieA });
  assert.equal(ownRead.response.status, 200);
  assert.equal(ownRead.data.student.name, "Private Learner Alpha");
  const crossRead = await call(`/api/students/${studentAId}`, { cookie: cookieB });
  assert.equal(crossRead.response.status, 404);
  const crossSearch = await call("/api/students?search=Private%20Learner%20Alpha", { cookie: cookieB });
  assert.equal(crossSearch.response.status, 200);
  assert.equal(crossSearch.data.total, 0, "search does not reveal another user's records");

  const crossUpdate = await call(`/api/students/${studentAId}`, { method: "PUT", cookie: cookieB, body: student("Attempted Cross-user Edit", "") });
  assert.equal(crossUpdate.response.status, 404);
  const crossDelete = await call(`/api/students/${studentAId}`, { method: "DELETE", cookie: cookieB });
  assert.equal(crossDelete.response.status, 404);
  const duplicate = await call("/api/students", { method: "POST", cookie: cookieA, body: student("Duplicate Roll", "duplicate@example.test") });
  assert.equal(duplicate.response.status, 409, "duplicate roll number is rejected within one workspace");

  const duplicateEmail = await call("/api/auth/register", { method: "POST", body: { name: "Duplicate Account", email: emailA.toUpperCase(), password, termsAccepted: true } });
  assert.equal(duplicateEmail.response.status, 409, "email uniqueness is normalized and enforced");

  const fieldCreate = await call("/api/custom-fields", { method: "POST", cookie: cookieA, body: { label: "Private Test Field", type: "short_text", required: false, options: [], showOnCard: false, searchable: true, filterable: true, exportable: true } });
  assert.equal(fieldCreate.response.status, 201, JSON.stringify(fieldCreate.data));
  fieldAId = fieldCreate.data.field.id;
  const updateOwn = await call(`/api/students/${studentAId}`, { method: "PUT", cookie: cookieA, body: { ...student("Private Learner Alpha", emailA.replace("privacy-a", "student-a")), customValues: { [fieldAId]: "Alpha-only custom value" } } });
  assert.equal(updateOwn.response.status, 200, JSON.stringify(updateOwn.data));
  const fieldsB = await call("/api/custom-fields", { cookie: cookieB });
  assert.equal(fieldsB.response.status, 200);
  assert.equal(fieldsB.data.fields.some((field) => field.id === fieldAId), false, "custom field definitions are isolated");
  const crossFieldUpdate = await call(`/api/custom-fields/${fieldAId}`, { method: "PUT", cookie: cookieB, body: { label: "Stolen", type: "short_text", required: false, options: [], showOnCard: false, searchable: false, filterable: false, exportable: true } });
  assert.equal(crossFieldUpdate.response.status, 404);
  const customSearchB = await call("/api/students?search=Alpha-only%20custom%20value", { cookie: cookieB });
  assert.equal(customSearchB.data.total, 0, "a private custom value cannot leak through search");

  const csvRow = { ...student("Imported Learner", "imported@example.test"), rollNumber: "PRIVACY-CSV-001", customValues: { [fieldAId]: "Imported private value" } };
  const preview = await call("/api/students/import", { method: "POST", cookie: cookieA, body: { rows: [csvRow, csvRow], dryRun: true } });
  assert.equal(preview.response.status, 200);
  assert.equal(preview.data.valid, 1);
  assert.equal(preview.data.failed, 1, "duplicate rows are reported during the dry run");
  const imported = await call("/api/students/import", { method: "POST", cookie: cookieA, body: { rows: [csvRow, csvRow], dryRun: false } });
  assert.equal(imported.response.status, 200);
  assert.equal(imported.data.imported, 1);
  assert.equal(imported.data.failed, 1);

  const statsA = await call("/api/dashboard/stats", { cookie: cookieA });
  const statsB = await call("/api/dashboard/stats", { cookie: cookieB });
  assert.equal(statsA.data.stats.total, 2);
  assert.equal(statsB.data.stats.total, 1);
  assert.equal(JSON.stringify(statsB.data).includes("Private Learner Alpha"), false);

  const formulaRecord = await call("/api/students", { method: "POST", cookie: cookieB, body: { ...student("=SUM(1,2)", "formula@example.test"), rollNumber: "PRIVACY-002" } });
  assert.equal(formulaRecord.response.status, 201, JSON.stringify(formulaRecord.data));
  const exportB = await call("/api/students/export", { cookie: cookieB });
  assert.equal(exportB.response.status, 200);
  const exported = String(exportB.data);
  assert.equal(exported.includes("Private Learner Alpha"), false, "CSV export contains only the current owner's rows");
  assert.equal(exported.includes("Private Learner Beta"), true);
  assert.equal(exported.includes("\"=SUM(1,2)\""), false, "formula-like cells are prefixed before CSV export");
  assert.equal(exported.includes("\"'=SUM(1,2)\""), true);

  const logout = await call("/api/auth/logout", { method: "POST", cookie: cookieB });
  const revokedCookie = logout.cookie;
  assert.equal(logout.response.status, 200);
  const afterLogout = await call("/api/auth/me", { cookie: revokedCookie });
  assert.equal(afterLogout.response.status, 401, "revoked session cannot access protected routes");
  const freshSession = await call("/api/auth/login", { method: "POST", body: { email: emailB, password } });
  assert.equal(freshSession.response.status, 200, "valid credentials can create a new session after logout");
  cleanupCookieB = freshSession.cookie;
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  loadContacts,
  saveContacts,
  addContact,
  removeContact,
  isContact,
  findContact,
} from "../contacts.js";
import type { Contact } from "@reef-protocol/protocol";

describe("contacts", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reef-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when no contacts file exists", () => {
    const contacts = loadContacts(tmpDir);
    expect(contacts).toEqual([]);
  });

  it("saves and loads contacts", () => {
    const contacts: Contact[] = [
      {
        name: "Alice",
        address: "0xAlice",
        addedAt: "2026-01-01T00:00:00Z",
        trusted: true,
      },
    ];

    saveContacts(contacts, tmpDir);
    const loaded = loadContacts(tmpDir);

    expect(loaded).toEqual(contacts);
  });

  it("adds a contact", () => {
    const contact: Contact = {
      name: "Bob",
      address: "0xBob",
      addedAt: "2026-01-01T00:00:00Z",
      trusted: true,
    };

    addContact(contact, tmpDir);
    const contacts = loadContacts(tmpDir);

    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("Bob");
  });

  it("updates an existing contact by address", () => {
    addContact(
      {
        name: "Bob",
        address: "0xBob",
        addedAt: "2026-01-01T00:00:00Z",
        trusted: false,
      },
      tmpDir,
    );

    addContact(
      {
        name: "Bob Updated",
        address: "0xBob",
        addedAt: "2026-01-02T00:00:00Z",
        trusted: true,
      },
      tmpDir,
    );

    const contacts = loadContacts(tmpDir);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].name).toBe("Bob Updated");
    expect(contacts[0].trusted).toBe(true);
  });

  it("removes a contact", () => {
    addContact(
      {
        name: "Alice",
        address: "0xAlice",
        addedAt: "2026-01-01T00:00:00Z",
        trusted: true,
      },
      tmpDir,
    );

    const removed = removeContact("0xAlice", tmpDir);
    expect(removed).toBe(true);

    const contacts = loadContacts(tmpDir);
    expect(contacts).toHaveLength(0);
  });

  it("returns false when removing non-existent contact", () => {
    const removed = removeContact("0xNotExist", tmpDir);
    expect(removed).toBe(false);
  });

  it("checks if an address is a contact", () => {
    addContact(
      {
        name: "Alice",
        address: "0xAlice",
        addedAt: "2026-01-01T00:00:00Z",
        trusted: true,
      },
      tmpDir,
    );

    expect(isContact("0xAlice", tmpDir)).toBe(true);
    expect(isContact("0xBob", tmpDir)).toBe(false);
  });

  it("handles case-insensitive address matching", () => {
    addContact(
      {
        name: "Alice",
        address: "0xAbCdEf",
        addedAt: "2026-01-01T00:00:00Z",
        trusted: true,
      },
      tmpDir,
    );

    expect(isContact("0xabcdef", tmpDir)).toBe(true);
    expect(isContact("0xABCDEF", tmpDir)).toBe(true);
  });

  it("finds a contact by address", () => {
    addContact(
      {
        name: "Alice",
        address: "0xAlice",
        addedAt: "2026-01-01T00:00:00Z",
        trusted: true,
      },
      tmpDir,
    );

    const found = findContact("0xAlice", tmpDir);
    expect(found?.name).toBe("Alice");

    const notFound = findContact("0xBob", tmpDir);
    expect(notFound).toBeUndefined();
  });
});

import { getDb } from "./index.js";
import type { EvacueeMedicalProfile, EvacueeMedicalPublic } from "../types.js";

const SEED_EVACUEES: Array<{
  evacueeId: string;
  fullName: string;
  age: number;
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContact: string;
  notes: string;
  faceDescriptor: number[] | null;
}> = [
  {
    evacueeId: "AUR-1001",
    fullName: "Priya Sharma",
    age: 34,
    bloodGroup: "O+",
    allergies: ["Penicillin", "Shellfish"],
    conditions: ["Asthma"],
    medications: ["Salbutamol inhaler PRN"],
    emergencyContact: "+91 98765 43210 (husband — Rajesh)",
    notes: "Carries blue inhaler in left jacket pocket.",
    faceDescriptor: null,
  },
  {
    evacueeId: "AUR-1002",
    fullName: "Raj Malhotra",
    age: 58,
    bloodGroup: "B+",
    allergies: [],
    conditions: ["Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin 500mg", "Amlodipine 5mg"],
    emergencyContact: "+91 91234 56789 (daughter — Ananya)",
    notes: "Needs regular meals; hypoglycemia risk if fasting.",
    faceDescriptor: null,
  },
  {
    evacueeId: "AUR-1003",
    fullName: "Meera Khan",
    age: 7,
    bloodGroup: "AB-",
    allergies: ["Peanuts", "Latex"],
    conditions: ["Epilepsy"],
    medications: ["Levetiracetam 250mg BID"],
    emergencyContact: "+91 99887 76655 (mother — Fatima Khan)",
    notes: "Pediatric case — parents separated in crowd at Sector 12 hall.",
    faceDescriptor: null,
  },
  {
    evacueeId: "AUR-1004",
    fullName: "James Okafor",
    age: 45,
    bloodGroup: "A+",
    allergies: ["Iodine contrast"],
    conditions: ["Previous MI (2022)", "Mild CKD"],
    medications: ["Aspirin 81mg", "Atorvastatin 20mg"],
    emergencyContact: "+91 90001 12233 (brother — Emeka)",
    notes: "Family not on-site; pre-registered during cyclone preparedness week.",
    faceDescriptor: null,
  },
];

function rowToEvacuee(row: Record<string, unknown>): EvacueeMedicalProfile {
  let faceDescriptor: number[] | null = null;
  if (row.face_descriptor_json) {
    faceDescriptor = JSON.parse(row.face_descriptor_json as string) as number[];
  }
  return {
    id: row.id as string,
    evacueeId: row.evacuee_id as string,
    fullName: row.full_name as string,
    age: row.age as number,
    bloodGroup: row.blood_group as string,
    allergies: JSON.parse((row.allergies_json as string) || "[]") as string[],
    conditions: JSON.parse((row.conditions_json as string) || "[]") as string[],
    medications: JSON.parse((row.medications_json as string) || "[]") as string[],
    emergencyContact: row.emergency_contact as string,
    notes: row.notes as string,
    faceDescriptor,
    registeredAt: row.registered_at as string,
    registeredBy: row.registered_by as string | null,
  };
}

export function toPublicProfile(p: EvacueeMedicalProfile): EvacueeMedicalPublic {
  return {
    evacueeId: p.evacueeId,
    fullName: p.fullName,
    age: p.age,
    bloodGroup: p.bloodGroup,
    allergies: p.allergies,
    conditions: p.conditions,
    medications: p.medications,
    emergencyContact: p.emergencyContact,
    notes: p.notes,
    hasFaceOnFile: Boolean(p.faceDescriptor?.length),
    registeredAt: p.registeredAt,
  };
}

export function initMedicalSchema(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS evacuees (
      id TEXT PRIMARY KEY,
      evacuee_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      age INTEGER NOT NULL,
      blood_group TEXT NOT NULL,
      allergies_json TEXT NOT NULL DEFAULT '[]',
      conditions_json TEXT NOT NULL DEFAULT '[]',
      medications_json TEXT NOT NULL DEFAULT '[]',
      emergency_contact TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      face_descriptor_json TEXT,
      registered_at TEXT NOT NULL,
      registered_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_evacuees_code ON evacuees(evacuee_id);

    CREATE TABLE IF NOT EXISTS medical_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evacuee_id TEXT NOT NULL,
      operator TEXT NOT NULL,
      method TEXT NOT NULL,
      accessed_at TEXT NOT NULL
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as c FROM evacuees").get() as { c: number };
  if (count.c === 0) {
    seedEvacuees();
  }
}

function seedEvacuees(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO evacuees (
      id, evacuee_id, full_name, age, blood_group,
      allergies_json, conditions_json, medications_json,
      emergency_contact, notes, face_descriptor_json, registered_at, registered_by
    ) VALUES (
      @id, @evacueeId, @fullName, @age, @bloodGroup,
      @allergiesJson, @conditionsJson, @medicationsJson,
      @emergencyContact, @notes, @faceDescriptorJson, @registeredAt, @registeredBy
    )
  `);

  const tx = db.transaction(() => {
    for (const e of SEED_EVACUEES) {
      insert.run({
        id: `evac-${e.evacueeId.toLowerCase()}`,
        evacueeId: e.evacueeId,
        fullName: e.fullName,
        age: e.age,
        bloodGroup: e.bloodGroup,
        allergiesJson: JSON.stringify(e.allergies),
        conditionsJson: JSON.stringify(e.conditions),
        medicationsJson: JSON.stringify(e.medications),
        emergencyContact: e.emergencyContact,
        notes: e.notes,
        faceDescriptorJson: e.faceDescriptor ? JSON.stringify(e.faceDescriptor) : null,
        registeredAt: now,
        registeredBy: "system-seed",
      });
    }
  });
  tx();
}

export function listEvacuees(): EvacueeMedicalPublic[] {
  const rows = getDb().prepare("SELECT * FROM evacuees ORDER BY evacuee_id").all() as Record<string, unknown>[];
  return rows.map((r) => toPublicProfile(rowToEvacuee(r)));
}

export function getEvacueeByCode(evacueeId: string): EvacueeMedicalProfile | null {
  const row = getDb()
    .prepare("SELECT * FROM evacuees WHERE evacuee_id = ? COLLATE NOCASE")
    .get(evacueeId.trim()) as Record<string, unknown> | undefined;
  return row ? rowToEvacuee(row) : null;
}

export function getEvacueeById(id: string): EvacueeMedicalProfile | null {
  const row = getDb().prepare("SELECT * FROM evacuees WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToEvacuee(row) : null;
}

export function listEvacueesWithDescriptors(): Array<{ id: string; descriptor: number[] }> {
  const rows = getDb()
    .prepare("SELECT id, face_descriptor_json FROM evacuees WHERE face_descriptor_json IS NOT NULL")
    .all() as Array<{ id: string; face_descriptor_json: string }>;

  return rows
    .map((r) => ({
      id: r.id,
      descriptor: JSON.parse(r.face_descriptor_json) as number[],
    }))
    .filter((r) => r.descriptor.length > 0);
}

export function registerEvacuee(
  input: {
    evacueeId: string;
    fullName: string;
    age: number;
    bloodGroup: string;
    allergies: string[];
    conditions: string[];
    medications: string[];
    emergencyContact: string;
    notes: string;
    faceDescriptor?: number[] | null;
  },
  registeredBy: string
): EvacueeMedicalProfile {
  const db = getDb();
  const existing = getEvacueeByCode(input.evacueeId);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(
      `UPDATE evacuees SET
        full_name = @fullName,
        age = @age,
        blood_group = @bloodGroup,
        allergies_json = @allergiesJson,
        conditions_json = @conditionsJson,
        medications_json = @medicationsJson,
        emergency_contact = @emergencyContact,
        notes = @notes,
        face_descriptor_json = COALESCE(@faceDescriptorJson, face_descriptor_json),
        registered_at = @registeredAt,
        registered_by = @registeredBy
      WHERE evacuee_id = @evacueeId`
    ).run({
      evacueeId: input.evacueeId,
      fullName: input.fullName,
      age: input.age,
      bloodGroup: input.bloodGroup,
      allergiesJson: JSON.stringify(input.allergies),
      conditionsJson: JSON.stringify(input.conditions),
      medicationsJson: JSON.stringify(input.medications),
      emergencyContact: input.emergencyContact,
      notes: input.notes,
      faceDescriptorJson: input.faceDescriptor ? JSON.stringify(input.faceDescriptor) : null,
      registeredAt: now,
      registeredBy,
    });
    return getEvacueeByCode(input.evacueeId)!;
  }

  const id = `evac-${input.evacueeId.toLowerCase().replace(/[^a-z0-9-]/g, "")}`;
  db.prepare(
    `INSERT INTO evacuees (
      id, evacuee_id, full_name, age, blood_group,
      allergies_json, conditions_json, medications_json,
      emergency_contact, notes, face_descriptor_json, registered_at, registered_by
    ) VALUES (
      @id, @evacueeId, @fullName, @age, @bloodGroup,
      @allergiesJson, @conditionsJson, @medicationsJson,
      @emergencyContact, @notes, @faceDescriptorJson, @registeredAt, @registeredBy
    )`
  ).run({
    id,
    evacueeId: input.evacueeId,
    fullName: input.fullName,
    age: input.age,
    bloodGroup: input.bloodGroup,
    allergiesJson: JSON.stringify(input.allergies),
    conditionsJson: JSON.stringify(input.conditions),
    medicationsJson: JSON.stringify(input.medications),
    emergencyContact: input.emergencyContact,
    notes: input.notes,
    faceDescriptorJson: input.faceDescriptor ? JSON.stringify(input.faceDescriptor) : null,
    registeredAt: now,
    registeredBy,
  });

  return getEvacueeById(id)!;
}

export function updateEvacueeFaceDescriptor(evacueeId: string, descriptor: number[]): EvacueeMedicalProfile | null {
  const existing = getEvacueeByCode(evacueeId);
  if (!existing) return null;

  getDb()
    .prepare("UPDATE evacuees SET face_descriptor_json = ? WHERE evacuee_id = ?")
    .run(JSON.stringify(descriptor), evacueeId);

  return getEvacueeByCode(evacueeId);
}

export function logMedicalAccess(evacueeId: string, operator: string, method: string): void {
  getDb()
    .prepare(
      `INSERT INTO medical_access_log (evacuee_id, operator, method, accessed_at) VALUES (?, ?, ?, ?)`
    )
    .run(evacueeId, operator, method, new Date().toISOString());
}

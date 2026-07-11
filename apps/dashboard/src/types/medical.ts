export interface EvacueeMedicalPublic {
  evacueeId: string;
  fullName: string;
  age: number;
  bloodGroup: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContact: string;
  notes: string;
  hasFaceOnFile: boolean;
  registeredAt: string;
}

export interface MedicalIdentifyResponse {
  match?: {
    evacueeId: string;
    confidence: number;
    distance: number;
  };
  profile: EvacueeMedicalPublic;
}

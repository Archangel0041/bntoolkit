import { useState, useEffect, useCallback } from "react";
import type { Party, PartyUnit } from "@/types/battleSimulator";
import { 
  getParties, 
  saveParty, 
  deleteParty, 
  createNewParty, 
  addUnitToParty, 
  removeUnitFromParty,
  updateUnitRank 
} from "@/lib/partyStorage";

export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  useEffect(() => {
    setParties(getParties());
  }, []);

  const selectedParty = parties.find(p => p.id === selectedPartyId) || null;

  const refreshParties = useCallback(() => {
    setParties(getParties());
  }, []);

  const createParty = useCallback((name: string) => {
    const newParty = createNewParty(name);
    saveParty(newParty);
    refreshParties();
    setSelectedPartyId(newParty.id);
    return newParty;
  }, [refreshParties]);

  const updateParty = useCallback((party: Party) => {
    saveParty(party);
    refreshParties();
  }, [refreshParties]);

  const removeParty = useCallback((partyId: string) => {
    deleteParty(partyId);
    if (selectedPartyId === partyId) {
      setSelectedPartyId(null);
    }
    refreshParties();
  }, [selectedPartyId, refreshParties]);

  const addUnit = useCallback((unit: PartyUnit) => {
    if (!selectedParty) return;
    const updated = addUnitToParty(selectedParty, unit);
    saveParty(updated);
    refreshParties();
  }, [selectedParty, refreshParties]);

  const removeUnit = useCallback((gridId: number) => {
    if (!selectedParty) return;
    const updated = removeUnitFromParty(selectedParty, gridId);
    saveParty(updated);
    refreshParties();
  }, [selectedParty, refreshParties]);

  const setUnitRank = useCallback((gridId: number, rank: number) => {
    if (!selectedParty) return;
    const updated = updateUnitRank(selectedParty, gridId, rank);
    saveParty(updated);
    refreshParties();
  }, [selectedParty, refreshParties]);

  const renameParty = useCallback((name: string) => {
    if (!selectedParty) return;
    const updated = { ...selectedParty, name, updatedAt: Date.now() };
    saveParty(updated);
    refreshParties();
  }, [selectedParty, refreshParties]);

  return {
    parties,
    selectedParty,
    selectedPartyId,
    setSelectedPartyId,
    createParty,
    updateParty,
    removeParty,
    addUnit,
    removeUnit,
    setUnitRank,
    renameParty,
  };
}

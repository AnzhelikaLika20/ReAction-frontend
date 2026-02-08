import { httpClient } from "./httpClient";
import type { Scenario } from "../types";

export const scenarioService = {
  async getAll(): Promise<Scenario[]> {
    return httpClient.get<Scenario[]>("/scenarios");
  },

  async getById(id: string): Promise<Scenario> {
    return httpClient.get<Scenario>(`/scenarios/${id}`);
  },

  async create(scenario: Omit<Scenario, "id">): Promise<Scenario> {
    return httpClient.post<Scenario>("/scenarios", scenario);
  },

  async update(id: string, scenario: Partial<Scenario>): Promise<Scenario> {
    return httpClient.put<Scenario>(`/scenarios/${id}`, scenario);
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/scenarios/${id}`);
  },
};

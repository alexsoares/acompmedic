export type MedicalReportAIExtraction = {
  rawText: string;
  summary: string;
  cids: string[];
  medications: string[];
  diseases: string[];
  exams: string[];
};

export type MedicalReportAIAnswer = {
  answer: string;
  references: string[];
};

export interface MedicalReportAIService {
  extractTextFromPdf(input: { filePath: string }): Promise<string>;
  summarizeReport(input: { text: string }): Promise<string>;
  identifyCid(input: { text: string }): Promise<string[]>;
  identifyMedications(input: { text: string }): Promise<string[]>;
  identifyDiseases(input: { text: string }): Promise<string[]>;
  identifyExams(input: { text: string }): Promise<string[]>;
  extractStructuredData(input: { text: string }): Promise<MedicalReportAIExtraction>;
  answerQuestion(input: { text: string; question: string }): Promise<MedicalReportAIAnswer>;
}

export class UnconfiguredMedicalReportAIService implements MedicalReportAIService {
  private readonly errorMessage = "MedicalReportAIService is not configured yet.";

  private fail(): never {
    throw new Error(this.errorMessage);
  }

  async extractTextFromPdf(_input: { filePath: string }): Promise<string> {
    void _input;
    return this.fail();
  }

  async summarizeReport(_input: { text: string }): Promise<string> {
    void _input;
    return this.fail();
  }

  async identifyCid(_input: { text: string }): Promise<string[]> {
    void _input;
    return this.fail();
  }

  async identifyMedications(_input: { text: string }): Promise<string[]> {
    void _input;
    return this.fail();
  }

  async identifyDiseases(_input: { text: string }): Promise<string[]> {
    void _input;
    return this.fail();
  }

  async identifyExams(_input: { text: string }): Promise<string[]> {
    void _input;
    return this.fail();
  }

  async extractStructuredData(_input: { text: string }): Promise<MedicalReportAIExtraction> {
    void _input;
    return this.fail();
  }

  async answerQuestion(_input: { text: string; question: string }): Promise<MedicalReportAIAnswer> {
    void _input;
    return this.fail();
  }
}

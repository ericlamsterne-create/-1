
import { Session, SentenceData, UserAudio, P2Session } from '../types';

// We assume 'docx' and 'mammoth' are available globally via script tags in index.html
declare const docx: any;
declare const mammoth: any;

const EXPORT_VERSION = "1.1";
const MARKER_START = "【LINGUAFLOW_RECORD_START】";
const MARKER_END = "【LINGUAFLOW_RECORD_END】";
const P2_MARKER_START = "【LINGUAFLOW_P2_START】";
const P2_MARKER_END = "【LINGUAFLOW_P2_END】";
const SEPARATOR = "------------------------------------------------";

// Helper to format date
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
};

export const exportHistoryToWord = async (history: Session[], p2History: P2Session[] = []): Promise<void> => {
    if ((!history || history.length === 0) && (!p2History || p2History.length === 0)) return;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

    const docChildren: any[] = [];

    // Title
    docChildren.push(
        new Paragraph({
            text: "LinguaFlow 学习记录备份",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        })
    );

    docChildren.push(
        new Paragraph({
            text: `Backup Version: ${EXPORT_VERSION}`,
            color: "999999",
            spacing: { after: 100 }
        })
    );

    docChildren.push(
        new Paragraph({
            text: "说明：您可以直接编辑 [ ] 下方的内容。请勿修改 ID、格式标记或分隔符，否则会导致恢复失败。",
            italics: true,
            color: "666666",
            spacing: { after: 400 }
        })
    );

    // --- Section 1: Standard Sentences ---
    history.forEach((session, index) => {
        // Session Start Block
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: MARKER_START, bold: true, color: "008800" }),
                    new TextRun({ text: "\nID: " + session.id, break: 1 }),
                    new TextRun({ text: "\nTIME: " + formatDate(session.timestamp), break: 1 }),
                    new TextRun({ text: "\n" + SEPARATOR, break: 1, color: "CCCCCC" }),
                ],
                spacing: { before: 200 }
            })
        );

        // Core Phrase
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "CORE_PHRASES:", bold: true, color: "000000" }),
                    new TextRun({ text: "\n" + (session.corePhrase || "N/A"), break: 1 })
                ],
                spacing: { before: 100, after: 100 }
            })
        );
        docChildren.push(new Paragraph({ text: SEPARATOR, color: "CCCCCC" }));

        // Sentences
        session.sentences.forEach((sent, sIdx) => {
            const header = `SENTENCE_${sIdx + 1} [${sent.type}]:`;
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: header, bold: true, color: "000088" }),
                        new TextRun({ text: "\n" + (sent.content || ""), break: 1 })
                    ],
                    spacing: { before: 100, after: 100 }
                })
            );
            docChildren.push(new Paragraph({ text: SEPARATOR, color: "CCCCCC" }));
        });

        // Session End
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: MARKER_END, bold: true, color: "008800" }),
                ],
                spacing: { before: 200, after: 400 }
            })
        );
    });

    // --- Section 2: P2 Stories ---
    if (p2History && p2History.length > 0) {
        docChildren.push(new Paragraph({ text: "=== PART 2 STORIES ===", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        
        p2History.forEach(p2 => {
             docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: P2_MARKER_START, bold: true, color: "880000" }),
                        new TextRun({ text: "\nID: " + p2.id, break: 1 }),
                        new TextRun({ text: "\nTOPIC: " + p2.topic, break: 1 }),
                        new TextRun({ text: "\nCORE_PHRASES: " + p2.corePhrases.join(", "), break: 1 }),
                        new TextRun({ text: "\n" + SEPARATOR, break: 1, color: "CCCCCC" }),
                    ]
                })
            );

            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: "CONTENT:", bold: true }),
                        new TextRun({ text: "\n" + p2.content, break: 1 })
                    ],
                    spacing: { before: 100 }
                })
            );

             docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: "LOGIC_VISUAL:", bold: true }),
                        new TextRun({ text: "\n" + p2.logic, break: 1 })
                    ],
                    spacing: { before: 100 }
                })
            );

            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: P2_MARKER_END, bold: true, color: "880000" }),
                    ],
                    spacing: { after: 300 }
                })
            );
        });
    }


    const doc = new Document({
        sections: [{
            properties: {},
            children: docChildren,
        }],
    });

    const blob = await Packer.toBlob(doc);
    
    // Trigger Download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `LinguaFlow_Backup_${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const importHistoryFromWord = async (file: File, currentHistory: Session[]): Promise<{ sessions: Session[], p2Sessions: P2Session[] }> => {
    return new Promise((resolve, reject) => {
        if (!mammoth) {
            reject(new Error("Mammoth library not loaded"));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                const text = result.value; // The raw text
                
                // --- VERSION & FORMAT CHECK ---
                // We check for the explicit presence of LinguaFlow markers or version tag.
                // Simple check: does it have "LinguaFlow" and "Backup Version"?
                if (!text.includes("LinguaFlow") || !text.includes("Backup Version")) {
                     reject(new Error("文件格式错误或版本不兼容 (Invalid File Format or Version)"));
                     return;
                }

                const sessions: Session[] = [];
                const p2Sessions: P2Session[] = [];
                
                // --- Parse Standard Sessions ---
                const blocks = text.split(MARKER_START);
                for (let i = 1; i < blocks.length; i++) {
                    const block = blocks[i];
                    if (!block.includes(MARKER_END)) continue; 
                    
                    try {
                        const idMatch = block.match(/ID:\s*(\S+)/);
                        const id = idMatch ? idMatch[1].trim() : Date.now().toString() + Math.random();

                        const coreMatch = block.match(/CORE_PHRASES:\s*([\s\S]*?)(?:---)/);
                        const corePhrase = coreMatch ? coreMatch[1].trim() : "";

                        const sentences: SentenceData[] = [];
                        const sentRegex = /SENTENCE_\d+\s*\[(.*?)]:\s*([\s\S]*?)(?:---)/g;
                        let match;
                        while ((match = sentRegex.exec(block)) !== null) {
                            sentences.push({
                                type: match[1].trim(),
                                content: match[2].trim(),
                                draftInput: match[2].trim(),
                            });
                        }

                        if (sentences.length === 0) continue;

                        // Try to find existing session to preserve UserAudios
                        const existingSession = currentHistory.find(h => h.id === id);
                        
                        sessions.push({
                            id: id,
                            timestamp: existingSession ? existingSession.timestamp : Date.now(),
                            corePhrase: corePhrase,
                            sentences: sentences,
                            userAudios: existingSession ? existingSession.userAudios : []
                        });

                    } catch (parseError) { console.error("Error parsing session", parseError); }
                }

                // --- Parse P2 Sessions ---
                const p2Blocks = text.split(P2_MARKER_START);
                for (let i = 1; i < p2Blocks.length; i++) {
                     const block = p2Blocks[i];
                     if (!block.includes(P2_MARKER_END)) continue;

                     try {
                        const idMatch = block.match(/ID:\s*(\S+)/);
                        const id = idMatch ? idMatch[1].trim() : Date.now().toString() + Math.random();
                        
                        const topicMatch = block.match(/TOPIC:\s*(.*)/);
                        const topic = topicMatch ? topicMatch[1].trim() : "Unknown Topic";

                        const phrasesMatch = block.match(/CORE_PHRASES:\s*(.*)/);
                        const phrases = phrasesMatch ? phrasesMatch[1].split(',').map((s: string) => s.trim()) : [];

                        const contentMatch = block.match(/CONTENT:\s*([\s\S]*?)(?:LOGIC_VISUAL:)/);
                        const content = contentMatch ? contentMatch[1].trim() : "";

                        const logicMatch = block.match(/LOGIC_VISUAL:\s*([\s\S]*?)(?:【)/);
                        const logic = logicMatch ? logicMatch[1].trim() : "";

                        p2Sessions.push({
                            id,
                            timestamp: Date.now(),
                            topic,
                            corePhrases: phrases,
                            content,
                            logic
                        });

                     } catch (e) { console.error("Error parsing P2", e); }
                }
                
                resolve({ sessions, p2Sessions });

            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const exportInspirationToWord = async (content: string): Promise<void> => {
    if (!content.trim()) return;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "LinguaFlow 灵感颗粒备份 (Inspiration Particles)",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { after: 300 }
                }),
                new Paragraph({
                    text: content,
                    spacing: { after: 200 }
                })
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `LinguaFlow_Inspiration_${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const importInspirationFromWord = async (file: File): Promise<string> => {
     return new Promise((resolve, reject) => {
        if (!mammoth) {
            reject(new Error("Mammoth library not loaded"));
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                const text = result.value.trim();
                
                if (!text) {
                    reject(new Error("File is empty or not readable text."));
                    return;
                }
                
                // Basic validation: ensure it's not binary garbage or too short
                if (text.length < 5) {
                    reject(new Error("Invalid file content (too short)."));
                    return;
                }

                resolve(text);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

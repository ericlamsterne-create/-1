
import { Session, SentenceData, UserAudio, P2Session, UserProfile } from '../types';

// We assume 'docx' and 'mammoth' are available globally via script tags in index.html
declare const docx: any;
declare const mammoth: any;

const EXPORT_VERSION = "2.1"; 
const MARKER_START = "【LF_START】"; 
const MARKER_END = "【LF_END】";
const P2_MARKER_START = "【LF_P2_START】";
const P2_MARKER_END = "【LF_P2_END】";
const PERSONA_MARKER = "【LF_PERSONA】";

// Helper to format date
const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
};

export const exportHistoryToWord = async (history: Session[], p2History: P2Session[] = []): Promise<void> => {
    if ((!history || history.length === 0) && (!p2History || p2History.length === 0)) {
        alert("暂无历史记录可导出");
        return;
    }

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

    const docChildren: any[] = [];

    // --- Elegant Header ---
    docChildren.push(
        new Paragraph({
            text: "Ieltsformula 学习笔记",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
        })
    );

    docChildren.push(
        new Paragraph({
            children: [
                new TextRun({ text: `Generated on ${new Date().toLocaleDateString()} • v${EXPORT_VERSION}`, size: 16, color: "999999" })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        })
    );

    // --- Section 1: Sentences (Compact Mode) ---
    history.forEach((session, index) => {
        // Compact Metadata Line
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: MARKER_START, size: 20, color: "FF0000", bold: true }), // RED MARKER
                    new TextRun({ text: ` (Do not delete)`, size: 14, color: "999999", italics: true }),
                    new TextRun({ text: ` | ID:${session.id} | ${formatDate(session.timestamp)}`, size: 16, color: "CCCCCC" }),
                ],
                spacing: { before: 200 }
            })
        );

        // Core Phrase / Topic
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Topic: ", bold: true, color: "58CC02", size: 24 }),
                    new TextRun({ text: session.topicLabel || "Untitled", bold: true, size: 24, color: "333333" })
                ],
                spacing: { after: 100 },
                border: { bottom: { color: "EEEEEE", space: 1, value: BorderStyle.SINGLE, size: 6 } }
            })
        );

        // Sentences (Clean format)
        session.sentences.forEach((sent, sIdx) => {
            if (!sent.content) return;
            
            // Technical header for parser
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `::S${sIdx}::[${sent.type}]`, size: 20, color: "FF0000", bold: true }), // RED MARKER
                    ],
                    spacing: { before: 100 }
                })
            );

            // Question (Added as requested)
            if (sent.question && sent.question !== sent.type) {
                 docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Q: ", bold: true, color: "666666" }),
                            new TextRun({ text: sent.question, color: "666666", italics: true })
                        ],
                        spacing: { after: 50 }
                    })
                );
            }

            // Content
            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: sent.content, size: 22, color: "000000" })
                    ],
                    spacing: { after: 100 }
                })
            );
        });

        // End Marker
        docChildren.push(
            new Paragraph({
                children: [ new TextRun({ text: MARKER_END, size: 20, color: "FF0000", bold: true }) ], // RED MARKER
                spacing: { after: 300 }
            })
        );
    });

    // --- Section 2: P2 Stories / Custom Content ---
    if (p2History && p2History.length > 0) {
        docChildren.push(new Paragraph({ text: "Custom Content / Part 2 Stories", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
        
        p2History.forEach(p2 => {
             docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: P2_MARKER_START, size: 20, color: "FF0000", bold: true }), // RED MARKER
                        new TextRun({ text: ` | ID:${p2.id} | ${p2.topic}`, bold: true, color: "222222" }),
                    ],
                    spacing: { before: 200 }
                })
            );

            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: p2.content, size: 22 })
                    ],
                    spacing: { before: 100, after: 100 }
                })
            );

            if (p2.logic) {
                docChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Logic: " + p2.logic, size: 16, color: "666666", italics: true })
                        ],
                        spacing: { after: 100 }
                    })
                );
            }

            docChildren.push(
                new Paragraph({
                    children: [ new TextRun({ text: P2_MARKER_END, size: 20, color: "FF0000", bold: true }) ], // RED MARKER
                    spacing: { after: 200 }
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
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `Ieltsformula_History_${new Date().toISOString().split('T')[0]}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const exportTemplate = async (): Promise<void> => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "Ieltsformula 自定义内容模版 (Custom Content Template)", heading: HeadingLevel.HEADING_1 }),
                new Paragraph({ 
                    children: [
                        new TextRun({ text: "说明：请直接在下方替换文本内容。请勿删除红色特殊标记（如 ", italics: true }),
                        new TextRun({ text: "【LF_START】", color: "FF0000", bold: true }),
                        new TextRun({ text: ", ", italics: true }),
                        new TextRun({ text: "::S0::", color: "FF0000", bold: true }),
                        new TextRun({ text: " 等）。", italics: true }),
                    ],
                    spacing: { after: 400 } 
                }),
                
                // Sample Block
                new Paragraph({ children: [new TextRun({ text: MARKER_START, color: "FF0000", bold: true, size: 20 })] }), // RED
                new Paragraph({ children: [new TextRun({ text: "Topic: 我的自定义练习列表 (My Custom List)", bold: true })] }),
                
                // Item 1
                new Paragraph({ children: [new TextRun({ text: "::S0::[Part 1]", bold: true, color: "FF0000", size: 20 })] }), // RED
                new Paragraph({ text: "Q: What is your favorite sport? (Optional Question)" }),
                new Paragraph({ text: "I really enjoy swimming because it relaxes me after a long day at work." }),
                
                // Item 2
                new Paragraph({ children: [new TextRun({ text: "::S1::[Part 3]", bold: true, color: "FF0000", size: 20 })] }), // RED
                new Paragraph({ text: "在此处输入第二个句子。您可以复制 ::Sx:: 标记添加更多句子。" }),
                
                new Paragraph({ children: [new TextRun({ text: MARKER_END, color: "FF0000", bold: true, size: 20 })] }), // RED
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `Ieltsformula_Template.docx`;
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
                let text = result.value; 
                
                // Compatibility check
                const isLegacy = text.includes("LINGUAFLOW_RECORD_START"); // Old marker
                const isNew = text.includes("LF_START"); // New marker

                if (!isLegacy && !isNew) {
                     reject(new Error("未找到 Ieltsformula 标记，请确认文档格式是否正确。"));
                     return;
                }

                const sessions: Session[] = [];
                const p2Sessions: P2Session[] = [];
                
                // Use appropriate markers
                const mStart = isNew ? "【LF_START】" : "【LINGUAFLOW_RECORD_START】";
                const mEnd = isNew ? "【LF_END】" : "【LINGUAFLOW_RECORD_END】";

                // --- Parse Standard Sessions ---
                const blocks = text.split(mStart);
                for (let i = 1; i < blocks.length; i++) {
                    const block = blocks[i];
                    if (!block.includes(mEnd)) continue; 
                    
                    try {
                        const idMatch = block.match(/ID:\s*(\S+)/);
                        const id = idMatch ? idMatch[1].trim() : Date.now().toString() + Math.random();

                        // Match Topic/Core Phrase
                        let topic = "";
                        if (isNew) {
                            const topicMatch = block.match(/Topic:\s*(.*?)(?:\n|$)/);
                            topic = topicMatch ? topicMatch[1].trim() : "Custom Topic";
                        } else {
                            const coreMatch = block.match(/CORE_PHRASES:\s*([\s\S]*?)(?:---)/);
                            topic = coreMatch ? coreMatch[1].trim() : "Legacy Topic";
                        }

                        const sentences: SentenceData[] = [];
                        
                        if (isNew) {
                            // New compact parser: ::S0::[Part 1] \n Content
                            const parts = block.split(/::S\d+::/);
                            for (let j = 1; j < parts.length; j++) {
                                const part = parts[j];
                                const typeMatch = part.match(/\[(.*?)\]/);
                                const type = typeMatch ? typeMatch[1] : "Part 1";
                                // Remove the [Type] tag and trim to get content
                                let content = part.replace(/\[.*?\]/, "").trim();
                                
                                // Extract Question if present (Q: ...)
                                let question = type;
                                const qMatch = content.match(/Q:\s*(.*?)(?:\n|$)/);
                                if (qMatch) {
                                    question = qMatch[1].trim();
                                    content = content.replace(/Q:\s*.*?(?:\n|$)/, "").trim();
                                }

                                // Stop at end marker
                                content = content.split(mEnd)[0].trim();
                                
                                if (content) {
                                    sentences.push({
                                        type: type,
                                        question: question, 
                                        questionPart: type.includes('3') ? 'Part 3' : 'Part 1',
                                        content: content,
                                        draftInput: "",
                                    });
                                }
                            }
                        } else {
                            // Legacy parser
                            const sentRegex = /SENTENCE_\d+\s*\[(.*?)]:\s*([\s\S]*?)(?:---)/g;
                            let match;
                            while ((match = sentRegex.exec(block)) !== null) {
                                sentences.push({
                                    type: match[1].trim(),
                                    question: match[1].trim(),
                                    questionPart: 'Part 1',
                                    content: match[2].trim(),
                                    draftInput: "",
                                });
                            }
                        }

                        if (sentences.length === 0) continue;

                        // Check if ID exists, if so update, else create new
                        // For Custom Content imports, we generally prefer creating new or merging carefully.
                        // Here we just construct the object.
                        const existingSession = currentHistory.find(h => h.id === id);
                        sessions.push({
                            id: id,
                            timestamp: existingSession ? existingSession.timestamp : Date.now(),
                            topicLabel: topic,
                            sentences: sentences,
                            userAudios: existingSession ? existingSession.userAudios : []
                        });

                    } catch (parseError) { console.error("Error parsing session", parseError); }
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
    const { Document, Packer, Paragraph, HeadingLevel } = docx;
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "Inspiration Particles", heading: HeadingLevel.HEADING_1, spacing: { after: 300 } }),
                new Paragraph({ text: content, spacing: { after: 200 } })
            ],
        }],
    });
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `Ieltsformula_Inspiration.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const importInspirationFromWord = async (file: File): Promise<string> => {
     return new Promise((resolve, reject) => {
        if (!mammoth) { reject(new Error("Mammoth library not loaded")); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                resolve(result.value.trim());
            } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
    });
};

export const exportPersonaToWord = async (profile: UserProfile): Promise<void> => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
    
    // Define exportable keys to ignore internal system fields
    const EXPORT_KEYS = [
        'targetScoreSpeaking', 'targetScoreDetail', 
        'identity_role', 'identity_education', 'identity_skills',
        'life_daily_routine', 'life_clothes', 'life_food', 'life_health', 'life_transport', 'life_objects',
        'env_city_country', 'env_housing', 'env_architecture', 'env_safety',
        'social_style', 'social_media', 'social_family', 'social_conflict', 'social_generations',
        'mind_personality', 'mind_emotion', 'mind_meditation',
        'interest_art', 'interest_movies', 'interest_history', 'interest_travel',
        'value_money', 'value_science', 'value_advertising', 'value_environment', 'value_success', 'value_tradition', 'value_globalization',
        'interest_keywords', 'user_defined_persona'
    ];

    const children: any[] = [
        new Paragraph({ text: "Ieltsformula Persona Profile", heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: PERSONA_MARKER, color: "FFFFFF", size: 1 })] }), // Marker
        new Paragraph({ text: "Instructions: Edit the values after the colon. Do not change the Keys (e.g. 'identity_role').", italics: true, spacing: { after: 300 } })
    ];

    EXPORT_KEYS.forEach(key => {
        const val = (profile as any)[key];
        const note = profile.persona_notes?.[key];
        
        if (val || note) {
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `${key}: `, bold: true, color: "222222" }),
                    new TextRun({ text: val || "(Empty)", color: "000000" })
                ],
                spacing: { before: 100 }
            }));
            
            if (note) {
               children.push(new Paragraph({
                    children: [
                        new TextRun({ text: `(Note for ${key}: ${note})`, italics: true, color: "666666", size: 20 })
                    ],
                    spacing: { after: 100 }
                })); 
            }
        }
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `Ieltsformula_Persona.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

export const importPersonaFromWord = async (file: File): Promise<Partial<UserProfile>> => {
    return new Promise((resolve, reject) => {
        if (!mammoth) { reject(new Error("Mammoth library not loaded")); return; }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                const text = result.value;

                if (!text.includes("LF_PERSONA")) {
                    reject(new Error("Invalid Persona File. Missing marker."));
                    return;
                }

                const partialProfile: any = { persona_notes: {} };
                
                // Regex to find "Key: Value" lines
                // Matches start of line or newline, key name, colon, value until newline
                const lines = text.split('\n');
                lines.forEach((line: string) => {
                    const cleanLine = line.trim();
                    
                    // Match main Key: Value
                    // e.g. "identity_role: Developer"
                    const mainMatch = cleanLine.match(/^([a-z_]+):\s*(.*)$/);
                    if (mainMatch) {
                        const key = mainMatch[1];
                        const val = mainMatch[2];
                        if (val && val !== "(Empty)") {
                            partialProfile[key] = val;
                        }
                    }

                    // Match Notes
                    // e.g. "(Note for identity_role: I am senior)"
                    const noteMatch = cleanLine.match(/^\(Note for ([a-z_]+):\s*(.*)\)$/);
                    if (noteMatch) {
                        const key = noteMatch[1];
                        const note = noteMatch[2];
                        if (!partialProfile.persona_notes) partialProfile.persona_notes = {};
                        partialProfile.persona_notes[key] = note;
                    }
                });

                resolve(partialProfile);
            } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
    });
};

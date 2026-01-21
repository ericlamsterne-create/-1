
import React, { useState, useEffect, useRef } from 'react';
import SentenceCard from './components/SentenceCard';
import UserProfileModal from './components/UserProfileModal';
import Login from './components/Login';
import FormulaDisplay from './components/FormulaDisplay'; 
import UserGuideModal from './components/UserGuideModal'; 
import PhoneticsModal from './components/PhoneticsModal'; 
import ReviewPlayerModal from './components/ReviewPlayerModal';
import { SentenceData, AccentType, Session, P2Session, UserProfile, P2Result, AppTheme, ListeningEntry, LogicFormula } from './types';
import { generateSingleSentence, generateSpeech, createWavBlob, evaluatePronunciation, optimizeUserSentence, pcmToAudioBuffer, warmupAudioCache } from './services/geminiService';
import { PHRASE_BANK } from './data/phraseBank';
import { IELTS_TAXONOMY, TopicCategory, filterQuestionsByKeywords, IELTS_Part1_Topics, IELTS_Part3_Topics } from './data/ieltsData';
import { SENTENCE_FORMULAS } from './data/sentenceFormulas';
import { exportHistoryToWord, importHistoryFromWord, exportTemplate } from './services/documentService';
import { subscribeToAuthChanges, signOut, saveUserDataToCloud, loadUserDataFromCloud, CloudData } from './services/firebase';
import { BookOpen, Check, History, X, Sparkles, Wand2, Pause, Play, Loader2, Settings, Download, Upload, Dices, FileUp, AlertCircle, Zap, Shield, Brain, Mic, StopCircle, Lightbulb, ArrowRight, ListMusic, Trash2, Volume2, Stars, Menu, Headphones, Briefcase, Home, Smartphone, Coffee, Users, Leaf, HelpCircle, Heart, GitCompare, MessageSquare, Globe, Clock, Calendar, Rocket, Scale, ArrowRightLeft, Gauge, Repeat1, ListOrdered, Infinity as InfinityIcon, LogIn, LogOut, Cloud, FileAudio, FileText, Repeat, Edit3 } from 'lucide-react';
import { VOICES_US_PRESET, VOICES_UK_PRESET } from '../data/voices';

// Unlimited sessions by default now
const MAX_FREE_SESSIONS = 99999;

interface BatchItem {
    id: string;
    question: string;
    answer: string;
    topic: string;
}

// Reverted to Original Logo
const ArcLogo = () => (
    <div className="w-10 h-10 relative group cursor-pointer hover:scale-105 transition-transform duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF75C3] via-[#FF5858] to-[#FFC371] rounded-[14px] shadow-lg shadow-red-500/20 rotate-0 group-hover:rotate-6 transition-all duration-300"></div>
        <div className="absolute inset-0.5 bg-white/20 rounded-[12px] backdrop-blur-[1px] flex items-center justify-center border border-white/30">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4C14.5 4 16 5.5 17 8L19 13C19.5 14.5 20 17 18 19C16 21 13 20 12 18C11 20 8 21 6 19C4 17 4.5 14.5 5 13L7 8C8 5.5 9.5 4 12 4Z" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 13H16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
             </svg>
        </div>
    </div>
);

const WavyBorder = () => (
    <div className="absolute -bottom-[10px] left-0 w-full h-[10px] z-40 overflow-hidden pointer-events-none leading-none">
        <svg className="w-full h-full text-bg-card fill-current block" preserveAspectRatio="none" viewBox="0 0 20 10" xmlns="http://www.w3.org/2000/svg">
            <defs>
               <pattern id="wavePattern" x="0" y="0" width="20" height="10" patternUnits="userSpaceOnUse">
                   <path d="M0,0 Q10,12 20,0 H0 Z" fill="currentColor"/>
               </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wavePattern)" />
        </svg>
    </div>
);

const LegalModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in duration-300 pointer-events-auto">
        <div className="bg-bg-card w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative flex flex-col max-h-[85vh] text-fg-main border border-border">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-bg-input hover:bg-bg-hover rounded-full text-fg-muted hover:text-fg-main transition-colors"><X className="w-5 h-5"/></button>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-
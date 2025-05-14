// app/teacher/exams/[examId]/edit/page.tsx
"use client";
import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Exam, Question, Option, QuestionType as PrismaQuestionType } from '@prisma/client';
import { PlusCircle, Trash2, Save, CheckSquare, AlertTriangle, FileText, Loader2 } from 'lucide-react';

const QuestionTypeEnum = PrismaQuestionType;

// Local state types
type LocalOption = Omit<Option, 'questionId'> & { tempId?: string; id?: string }; // id can be string from DB or undefined
type QuestionWithOptions = Omit<Question, 'examId' | 'options'> & {
  options: LocalOption[];
  tempId?: string; // For new questions before save
  id?: string;     // For existing questions from DB
};

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithOptions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<PrismaQuestionType>(QuestionTypeEnum.MCQ);
  const [newQuestionOptions, setNewQuestionOptions] = useState<{ text: string, isCorrect: boolean, tempId: string }[]>([
    { text: '', isCorrect: false, tempId: `new-opt-${Date.now()}` }
  ]);

  // Helper to map Prisma data to local state, ensuring 'options' is always an array
  const mapPrismaQuestionToLocal = (prismaQuestion: Question & { options?: Option[] | null }): QuestionWithOptions => {
    console.log("Mapping prisma question:", prismaQuestion);
    return {
      ...prismaQuestion, // Spread all fields from Prisma Question
      id: prismaQuestion.id, // Explicitly ensure id is there
      options: (prismaQuestion.options || []).map(opt => ({ ...opt, id: opt.id })), // Ensure options is array and options have id
    };
  };

  useEffect(() => {
    console.log("EditExamPage: useEffect triggered. examId:", examId);
    if (!examId) {
        console.error("EditExamPage: No examId found in params.");
        setIsLoading(false);
        setError("Exam ID is missing from URL.");
        return;
    }

    const fetchExamData = async () => {
      console.log(`EditExamPage: fetchExamData for examId: ${examId}`);
      setIsLoading(true);
      setError('');
      setSuccess('');
      try {
        const response = await fetch(`/api/teacher/exams/${examId}`);
        console.log(`EditExamPage: Fetch response status: ${response.status} for /api/teacher/exams/${examId}`);
        const responseText = await response.text(); // Get raw response text first
        if (!response.ok) {
          console.error(`EditExamPage: Failed to fetch exam data. Status: ${response.status}. Response: ${responseText}`);
          try {
            const errData = JSON.parse(responseText);
            throw new Error(errData.message || `Failed to fetch exam data (status ${response.status})`);
          } catch (parseError) {
            throw new Error(`Failed to fetch exam data (status ${response.status}) and parse error response.`);
          }
        }
        const data = JSON.parse(responseText);
        console.log("EditExamPage: Raw fetched data:", data);

        if (!data.exam) {
          console.error("EditExamPage: Exam data not found in API response's 'exam' property.");
          throw new Error("Exam data structure from API is incorrect.");
        }

        setExam(data.exam);
        const fetchedQuestions = (data.exam.questions || []).map(mapPrismaQuestionToLocal);
        console.log("EditExamPage: Mapped fetched questions for state:", fetchedQuestions);
        setQuestions(fetchedQuestions);

      } catch (err: any) {
        console.error("EditExamPage: Error in fetchExamData:", err);
        setError(err.message || "Could not load exam details.");
      } finally {
        setIsLoading(false);
        console.log("EditExamPage: fetchExamData finished.");
      }
    };
    fetchExamData();
  }, [examId]); // Only examId as dependency

  const handleAddQuestion = () => {
    console.log("EditExamPage: handleAddQuestion called.");
    setError('');
    if (!newQuestionText.trim()) {
      setError("Question text cannot be empty."); return;
    }
    if ((newQuestionType === QuestionTypeEnum.MCQ || newQuestionType === QuestionTypeEnum.TRUE_FALSE)) {
        if (newQuestionOptions.some(opt => !opt.text.trim())) {
            setError("Option text cannot be empty for new question."); return;
        }
        if (!newQuestionOptions.some(opt => opt.isCorrect)) {
            setError("At least one option must be marked as correct for MCQ/True/False new question."); return;
        }
    }

    const tempQuestionId = `temp-q-${Date.now()}`;
    const newQ: QuestionWithOptions = {
      tempId: tempQuestionId,
      id: undefined, // Explicitly undefined for new questions
      text: newQuestionText,
      type: newQuestionType,
      order: questions.length,
      options: (newQuestionType === QuestionTypeEnum.MCQ || newQuestionType === QuestionTypeEnum.TRUE_FALSE)
        ? newQuestionOptions.map(opt => ({
            id: undefined, // Explicitly undefined for new options
            tempId: opt.tempId,
            text: opt.text,
            isCorrect: opt.isCorrect,
          }))
        : [],
      createdAt: new Date(), // Dummy values, will be set by DB
      updatedAt: new Date(), // Dummy values, will be set by DB
    };
    console.log("EditExamPage: Adding new question to local state:", newQ);
    setQuestions(prev => {
        const updated = [...prev, newQ];
        console.log("EditExamPage: Questions state after adding new:", updated);
        return updated;
    });

    setNewQuestionText('');
    setNewQuestionType(QuestionTypeEnum.MCQ);
    setNewQuestionOptions([{ text: '', isCorrect: false, tempId: `new-opt-${Date.now()}` }]);
    setSuccess('Question added to list. Remember to save all changes.');
    setTimeout(() => setSuccess(''), 4000);
  };

  // --- Other handlers (handleOptionChange, handleAddOption, etc.) - Keep as is from previous good version ---
  // Ensure they use console.log for debugging if issues persist there
  // For brevity, I'll skip re-pasting them if they were generally okay, focus on core logic.
  // Key for these: ensure immutable updates to state.
  // Example for handleQuestionTextChange (apply similar logging to others):
  const handleQuestionTextChange = (qIndex: number, newText: string) => {
    setError('');
    setQuestions(prevQs => {
        const newQsList = [...prevQs];
        newQsList[qIndex] = { ...newQsList[qIndex], text: newText };
        console.log(`EditExamPage: Question ${qIndex} text changed. New list:`, newQsList);
        return newQsList;
    });
  };

  const handleOptionChange = (qIndex: number | 'new', optIndex: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setError('');
    const updateLogic = (optionsList: any[], type: PrismaQuestionType) => {
        const updatedOptions = [...optionsList];
        const targetOption = { ...updatedOptions[optIndex] };

        if (field === 'isCorrect') {
            targetOption.isCorrect = value as boolean;
            if (type === QuestionTypeEnum.MCQ && value === true) {
                updatedOptions.forEach((opt, i) => { if (i !== optIndex) opt.isCorrect = false; });
            }
             updatedOptions[optIndex] = targetOption;
        } else {
            targetOption.text = value as string;
            updatedOptions[optIndex] = targetOption;
        }
        return updatedOptions;
    };

    if (qIndex === 'new') {
        setNewQuestionOptions(prevOpts => {
            const updated = updateLogic(prevOpts, newQuestionType) as { text: string, isCorrect: boolean, tempId: string }[];
            console.log("EditExamPage: New question options changed:", updated);
            return updated;
        });
    } else {
        setQuestions(prevQs => {
            const newQsList = [...prevQs];
            const targetQuestion = { ...newQsList[qIndex] }; // Shallow copy question
            targetQuestion.options = updateLogic(targetQuestion.options, targetQuestion.type) as LocalOption[];
            newQsList[qIndex] = targetQuestion;
            console.log(`EditExamPage: Question ${qIndex} option ${optIndex} changed. New list:`, newQsList);
            return newQsList;
        });
    }
  };

  const handleAddOption = (qIndex: number | 'new') => {
    setError('');
    const newOptionBase = { text: '', isCorrect: false };
    if (qIndex === 'new') {
      setNewQuestionOptions(prev => [...prev, { ...newOptionBase, tempId: `new-opt-${Date.now()}-${prev.length}` }]);
    } else {
      setQuestions(prev => {
        const newQsList = [...prev];
        const targetQuestion = { ...newQsList[qIndex] };
        const newOpt: LocalOption = { tempId: `temp-opt-${Date.now()}-${targetQuestion.options.length}`, ...newOptionBase };
        targetQuestion.options = [...targetQuestion.options, newOpt];
        newQsList[qIndex] = targetQuestion;
        console.log(`EditExamPage: Option added to question ${qIndex}. New list:`, newQsList);
        return newQsList;
      });
    }
  };

  const handleRemoveOption = (qIndex: number | 'new', optIndex: number) => {
    setError('');
    const removeLogic = (optionsList: any[], type: PrismaQuestionType) => {
        if ((type === QuestionTypeEnum.MCQ || type === QuestionTypeEnum.TRUE_FALSE) && optionsList.length <= 1) {
            setError("MCQ/True/False questions must have at least one option."); return optionsList;
        }
        return optionsList.filter((_, i) => i !== optIndex);
    };
    if (qIndex === 'new') {
        setNewQuestionOptions(prevOpts => removeLogic(prevOpts, newQuestionType));
    } else {
        setQuestions(prevQs => {
            const newQsList = [...prevQs];
            const targetQuestion = { ...newQsList[qIndex] };
            targetQuestion.options = removeLogic(targetQuestion.options, targetQuestion.type);
            newQsList[qIndex] = targetQuestion;
            console.log(`EditExamPage: Option removed from question ${qIndex}. New list:`, newQsList);
            return newQsList;
        });
    }
  };

    const handleRemoveQuestion = (qIndex: number) => {
    setError('');
    setQuestions(prev => {
        const updated = prev.filter((_, i) => i !== qIndex);
        console.log("EditExamPage: Question removed. New list:", updated);
        return updated;
    });
    setSuccess('Question removed from list. Save changes to persist.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleQuestionTypeChange = (qIndex: number | 'new', type: PrismaQuestionType) => {
    setError('');
    let defaultOptionsTemplate: { text: string, isCorrect: boolean }[] = [];
    if (type === QuestionTypeEnum.TRUE_FALSE) {
        defaultOptionsTemplate = [{ text: 'True', isCorrect: false }, { text: 'False', isCorrect: false }];
    } else if (type === QuestionTypeEnum.MCQ) {
        defaultOptionsTemplate = [{ text: '', isCorrect: false }];
    }

    const generateOptionsWithTempIds = (template: {text: string, isCorrect: boolean}[]) => 
        template.map((opt, i) => ({ ...opt, tempId: `new-opt-${Date.now()}-${i}` }));

    if (qIndex === 'new') {
        setNewQuestionType(type);
        setNewQuestionOptions(generateOptionsWithTempIds(defaultOptionsTemplate));
    } else {
        setQuestions(prev => {
            const newQsList = [...prev];
            const targetQuestion = { ...newQsList[qIndex] };
            targetQuestion.type = type;
            targetQuestion.options = generateOptionsWithTempIds(defaultOptionsTemplate).map(opt => ({...opt, id: undefined})); // Ensure no old 'id'
            newQsList[qIndex] = targetQuestion;
            console.log(`EditExamPage: Question ${qIndex} type changed. New list:`, newQsList);
            return newQsList;
        });
    }
  };
  // --- END of other handlers ---

  const handleSaveChanges = async () => {
    console.log("EditExamPage: handleSaveChanges called.");
    setError('');
    setSuccess('');
    if (!exam) {
        setError("Exam data is not loaded. Cannot save.");
        console.error("EditExamPage: Save attempted but exam object is null.");
        return;
    }
    setIsSaving(true);

    // Client-side validation
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.text.trim()) {
            setError(`Text for question ${i + 1} cannot be empty.`); setIsSaving(false); return;
        }
        if ((q.type === QuestionTypeEnum.MCQ || q.type === QuestionTypeEnum.TRUE_FALSE)) {
            if (!q.options || q.options.length === 0) {
                setError(`Question ${i + 1} ("${q.text.substring(0,20)}...") must have options.`); setIsSaving(false); return;
            }
            if (q.options.some(opt => !opt.text.trim())) {
                 setError(`Options for question ${i + 1} ("${q.text.substring(0,20)}...") cannot be empty.`); setIsSaving(false); return;
            }
            if (!q.options.some(opt => opt.isCorrect)) {
                 setError(`At least one option must be correct for question ${i + 1} ("${q.text.substring(0,20)}...").`); setIsSaving(false); return;
            }
        }
    }
    console.log("EditExamPage: Client-side validation passed for save.");

    try {
      const payloadQuestions = questions.map((q, index) => {
        // If q.id exists, it's an existing question from DB.
        // If q.id is undefined but q.tempId exists, it's a new question.
        return {
          id: q.id, // Will be string (from DB) or undefined (new)
          // tempId: q.tempId, // We don't strictly need to send tempId to backend if backend differentiates by presence of 'id'
          text: q.text,
          type: q.type,
          order: index,
          options: q.options.map(opt => ({
            id: opt.id, // String (from DB) or undefined (new)
            // tempId: opt.tempId,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
        };
      });
      console.log("EditExamPage: Payload for save:", JSON.stringify({ questions: payloadQuestions }, null, 2));

      const response = await fetch(`/api/teacher/exams/${examId}/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: payloadQuestions }),
      });
      
      console.log(`EditExamPage: Save response status: ${response.status}`);
      const responseText = await response.text(); // Get raw response text
      
      if (!response.ok) {
        console.error(`EditExamPage: Failed to save changes. Status: ${response.status}. Response: ${responseText}`);
        try {
            const errData = JSON.parse(responseText);
            throw new Error(errData.message || errData.errors?.toString() || `Failed to save changes (status ${response.status})`);
        } catch (parseError) {
            throw new Error(`Failed to save changes (status ${response.status}) and parse error response.`);
        }
      }
      const responseData = JSON.parse(responseText);
      console.log("EditExamPage: Raw save response data:", responseData);

      if (!responseData.exam || !responseData.exam.questions) {
          console.error("EditExamPage: Saved data from API is missing 'exam' or 'exam.questions'. Response:", responseData);
          throw new Error("Received incomplete data from server after save.");
      }
      
      setExam(responseData.exam);
      const updatedQuestionsFromSave = (responseData.exam.questions || []).map(mapPrismaQuestionToLocal);
      console.log("EditExamPage: Mapped questions from save response:", updatedQuestionsFromSave);
      setQuestions(updatedQuestionsFromSave);
      setSuccess('Exam saved successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err: any) {
      console.error("EditExamPage: Error in handleSaveChanges:", err);
      setError(err.message || "An unknown error occurred while saving.");
    } finally {
      setIsSaving(false);
      console.log("EditExamPage: handleSaveChanges finished.");
    }
  };

  // --- JSX (Keep as is from previous good version or your current one) ---
  // Ensure keys for mapped elements are stable: key={q.id || q.tempId} for questions, key={opt.id || opt.tempId} for options.
  // I'll paste the JSX again to be complete, assuming it's the one from the previous working version.
    if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="ml-4 text-lg text-gray-700">Loading exam editor...</p>
    </div>
  );
  if (!exam && !isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Exam</h2>
        <p className="text-red-600 text-center">{error || "Exam not found or failed to load. Please check the Exam ID or try again later."}</p>
        <button
            onClick={() => router.push('/teacher/dashboard')}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
            Back to Dashboard
        </button>
    </div>
  );

  const getQuestionTypeIcon = (type: PrismaQuestionType) => {
    switch (type) {
        case QuestionTypeEnum.MCQ: return <CheckSquare className="mr-2 text-blue-500" size={18} />;
        case QuestionTypeEnum.TRUE_FALSE: return <AlertTriangle className="mr-2 text-orange-500" size={18} />;
        case QuestionTypeEnum.SHORT_ANSWER: return <FileText className="mr-2 text-green-500" size={18} />;
        default: return null;
    }
  }

  return (
    <>
    <div className="container mx-auto w-full   items-center justify-center p-4 sm:p-6 lg:p-8 h-screen  fixed">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-0">
            Edit Exam: <span className="text-indigo-600">{exam?.title || 'Loading...'}</span>
        </h1>
        <button
          onClick={handleSaveChanges}
          disabled={isSaving || isLoading}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-md shadow-md flex items-center justify-center transition duration-150 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save size={18} className="mr-2" />}
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {error && <p className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
      {success && <p className="bg-green-100 border border-green-300 text-green-700 p-3 rounded-md mb-4 text-sm">{success}</p>}
<div className="flex gap-4">
      <div className="space-y-6 w-[98%] md:w-[75%] mb-10 h-screen   overflow-y-auto">
        {questions.length === 0 && !isLoading && <p className="text-gray-500 text-center py-4">No questions added yet. Use the form below to add questions.</p>}
        {questions.map((q, qIndex) => (
          <div key={q.id || q.tempId} className="bg-white p-5 sm:p-6 rounded-lg shadow-lg border border-gray-200 transition-all hover:shadow-xl">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-grow mr-4">
                    <label htmlFor={`qtext-${q.id || q.tempId}`} className="block text-xs font-medium text-gray-500 mb-1">Question {qIndex + 1} Text</label>
                    <textarea
                        id={`qtext-${q.id || q.tempId}`}
                        value={q.text}
                        onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                        rows={2}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter question text"
                    />
                </div>
                <button
                    onClick={() => handleRemoveQuestion(qIndex)}
                    className="mt-5 text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors"
                    title="Remove Question"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            <div className="mb-4">
                <label htmlFor={`qtype-${q.id || q.tempId}`} className="block text-xs font-medium text-gray-500 mb-1">Question Type</label>
                <select
                    id={`qtype-${q.id || q.tempId}`}
                    value={q.type}
                    onChange={(e) => handleQuestionTypeChange(qIndex, e.target.value as PrismaQuestionType)}
                    className="w-full sm:w-auto p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
                >
                    {Object.values(QuestionTypeEnum).map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>

            {(q.type === QuestionTypeEnum.MCQ || q.type === QuestionTypeEnum.TRUE_FALSE) && (
              <div className="space-y-2 mt-3 pt-3 pl-4 border-l-2 border-indigo-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Options:</h4>
                {q.options.map((opt, optIndex) => (
                  <div key={opt.id || opt.tempId} className="flex items-center space-x-2 bg-gray-50 p-2.5 rounded-md border border-gray-200">
                    <input
                      type={q.type === QuestionTypeEnum.MCQ ? "radio" : "checkbox"}
                      name={`correct-opt-${q.id || q.tempId}`}
                      checked={opt.isCorrect}
                      onChange={(e) => handleOptionChange(qIndex, optIndex, 'isCorrect', e.target.checked)}
                      className="form-radio h-4.5 w-4.5 text-indigo-600 border-gray-300 focus:ring-indigo-500 rounded transition-colors"
                    />
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(qIndex, optIndex, 'text', e.target.value)}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-grow p-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      readOnly={q.type === QuestionTypeEnum.TRUE_FALSE && (opt.text === 'True' || opt.text === 'False')}
                    />
                    { q.type === QuestionTypeEnum.MCQ && 
                    <button onClick={() => handleRemoveOption(qIndex, optIndex)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                    }
                  </div>
                ))}
                { q.type === QuestionTypeEnum.MCQ &&
                <button
                  onClick={() => handleAddOption(qIndex)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium py-1"
                >
                  <PlusCircle size={16} className="mr-1" /> Add Option
                </button>
                }
              </div>
            )}
            {q.type === QuestionTypeEnum.SHORT_ANSWER && (
              <p className="text-sm text-gray-500 italic mt-2 pl-4">Short answer questions will be manually graded.</p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white w-[98%] md:w-[50%] h-full flex 
      flex-col 
      p-5 sm:p-6 rounded-lg shadow-xl border-2 border-indigo-200   bottom-4 z-10">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
            {getQuestionTypeIcon(newQuestionType)}
            Add New Question
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4 items-end">
            <div className="md:col-span-3">
                <label htmlFor="newQText" className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                <textarea
                id="newQText"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                placeholder="Enter question text"
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
            <div className="md:col-span-2">
                <label htmlFor="newQType" className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <select
                id="newQType"
                value={newQuestionType}
                onChange={(e) => handleQuestionTypeChange('new', e.target.value as PrismaQuestionType)}
                className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                {Object.values(QuestionTypeEnum).map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
                </select>
            </div>
             <div className="md:col-span-1">
                 <button
                    onClick={handleAddQuestion}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-md shadow-md flex items-center justify-center transition duration-150"
                    >
                    <PlusCircle size={18} className="mr-2 sm:mr-0 md:mr-2" /> <span className="hidden sm:inline md:hidden lg:inline">Add</span>
                </button>
            </div>
        </div>

        {(newQuestionType === QuestionTypeEnum.MCQ || newQuestionType === QuestionTypeEnum.TRUE_FALSE) && (
          <div className="mb-4 mt-2 pt-3 pl-4 border-l-2 border-indigo-100">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Options for New Question:</h4>
            {newQuestionOptions.map((opt, optIndex) => (
              <div key={opt.tempId} className="flex items-center space-x-2 mb-2 bg-gray-50 p-2.5 rounded-md border border-gray-200">
                <input
                  type={newQuestionType === QuestionTypeEnum.MCQ ? "radio" : "checkbox"}
                  name="new-question-correct-opt"
                  checked={opt.isCorrect}
                  onChange={(e) => handleOptionChange('new', optIndex, 'isCorrect', e.target.checked)}
                  className="form-radio h-4.5 w-4.5 text-indigo-600 border-gray-300 focus:ring-indigo-500 rounded"
                />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => handleOptionChange('new', optIndex, 'text', e.target.value)}
                  placeholder={`Option ${optIndex + 1}`}
                  className="flex-grow p-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  readOnly={newQuestionType === QuestionTypeEnum.TRUE_FALSE && (opt.text === 'True' || opt.text === 'False')}
                />
                { newQuestionType === QuestionTypeEnum.MCQ &&
                <button onClick={() => handleRemoveOption('new', optIndex)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
                }
              </div>
            ))}
            { newQuestionType === QuestionTypeEnum.MCQ &&
            <button
              onClick={() => handleAddOption('new')}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium py-1"
            >
              <PlusCircle size={16} className="mr-1" /> Add Option
            </button>
            }
          </div>
        )}
         {newQuestionType === QuestionTypeEnum.SHORT_ANSWER && (
            <p className="text-sm text-gray-500 italic mb-4 pl-4">Short answer questions will be manually graded.</p>
        )}
      </div>

      </div>
    </div>
    </>
  );
}
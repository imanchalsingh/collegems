import { useState } from "react";
import { Plus, Trash2, X, Save, ListChecks } from "lucide-react";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "file";

export interface FormFieldDraft {
  name: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (form: { _id: string; name: string; fields: FormFieldDraft[] }) => void;
  initial?: {
    _id?: string;
    name?: string;
    description?: string;
    fields?: FormFieldDraft[];
  };
  save: (payload: {
    name: string;
    description: string;
    fields: FormFieldDraft[];
  }) => Promise<{ _id: string; name: string; fields: FormFieldDraft[] }>;
}

const EMPTY_FIELD = (): FormFieldDraft => ({
  name: "",
  label: "",
  type: "text",
  required: false,
  options: [],
});

export default function FormBuilderModal({
  open,
  onClose,
  onSaved,
  initial,
  save,
}: Props) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [fields, setFields] = useState<FormFieldDraft[]>(
    initial?.fields?.length ? initial.fields : [EMPTY_FIELD()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const updateField = (index: number, key: keyof FormFieldDraft, value: unknown) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Form name is required");
      return;
    }
    if (!fields.length || fields.some((f) => !f.name || !f.label)) {
      setError("Each field needs a name and label");
      return;
    }
    setSaving(true);
    try {
      const saved = await save({ name: name.trim(), description, fields });
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(ax.response?.data?.error || ax.response?.data?.message || ax.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-blue-600" />
            Custom Form Builder
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm block">
              <span className="text-slate-600">Form name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Leave Request / Fee Concession"
              />
            </label>
            <label className="text-sm block">
              <span className="text-slate-600">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </label>
          </div>

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-lg border border-slate-100 bg-slate-50"
              >
                <label className="md:col-span-3 text-xs">
                  Name
                  <input
                    value={field.name}
                    onChange={(e) => updateField(idx, "name", e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1.5"
                    placeholder="days"
                  />
                </label>
                <label className="md:col-span-3 text-xs">
                  Label
                  <input
                    value={field.label}
                    onChange={(e) => updateField(idx, "label", e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1.5"
                    placeholder="Leave days"
                  />
                </label>
                <label className="md:col-span-2 text-xs">
                  Type
                  <select
                    value={field.type}
                    onChange={(e) => updateField(idx, "type", e.target.value)}
                    className="mt-1 w-full border rounded px-2 py-1.5"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="file">File upload</option>
                  </select>
                </label>
                {(field.type === "select" || field.type === "checkbox") && (
                  <label className="md:col-span-2 text-xs">
                    Options (comma)
                    <input
                      value={(field.options || []).join(",")}
                      onChange={(e) =>
                        updateField(
                          idx,
                          "options",
                          e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      className="mt-1 w-full border rounded px-2 py-1.5"
                    />
                  </label>
                )}
                <label className="md:col-span-1 text-xs flex items-center gap-1 pb-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(idx, "required", e.target.checked)}
                  />
                  Req
                </label>
                <button
                  type="button"
                  onClick={() => setFields(fields.filter((_, i) => i !== idx))}
                  className="md:col-span-1 text-red-500 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFields([...fields, EMPTY_FIELD()])}
            className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium"
          >
            <Plus className="w-4 h-4" /> Add field
          </button>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save form"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable react/prop-types -- project convention: no propTypes */
import { X, Upload } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
import { formatCNIC } from '@/lib/utils';

/**
 * Nominee details for member onboarding: name, CNIC, relation, and an
 * optional CNIC image upload with preview. Nominee state is held by the parent
 * (controlled inputs). The file input stays raw — there is no ui upload
 * primitive — and image handling is delegated via `onImageChange`.
 */
const NomineeSection = ({ nominee, setNominee, onImageChange }) => (
  <div className="space-y-3 p-4 rounded-2xl border border-border bg-amber-500/5">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
      Nominee Information
    </p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Nominee Name" htmlFor="nomineeName">
        <Input
          id="nomineeName"
          value={nominee.name}
          onChange={(e) => setNominee({ ...nominee, name: e.target.value })}
          placeholder="Full name of nominee"
        />
      </FormField>
      <FormField label="Nominee CNIC" htmlFor="nomineeCnic">
        <Input
          id="nomineeCnic"
          value={nominee.cnic}
          onChange={(e) => setNominee({ ...nominee, cnic: formatCNIC(e.target.value) })}
          placeholder="00000-0000000-0"
          className="font-mono tabular-nums"
        />
      </FormField>
    </div>

    <FormField label="Relation to Member" htmlFor="nomineeRelation">
      <Input
        id="nomineeRelation"
        value={nominee.relation}
        onChange={(e) => setNominee({ ...nominee, relation: e.target.value })}
        placeholder="e.g. Spouse, Father, Son"
      />
    </FormField>

    <FormField label="Nominee CNIC Image">
      <div className="flex flex-col gap-3">
        {nominee.cnicImage && (
          <div className="relative w-full h-32 rounded-2xl overflow-hidden border border-border bg-white shadow-sm flex items-center justify-center p-2">
            <img
              src={nominee.cnicImage}
              alt="CNIC Preview"
              className="max-w-full max-h-full object-contain"
            />
            <button
              type="button"
              onClick={() => setNominee({ ...nominee, cnicImage: '' })}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500 text-white hover:scale-110 transition-transform shadow-lg"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="relative group p-4 border-2 border-dashed border-border rounded-2xl bg-card text-center hover:bg-muted/40 transition-all overflow-hidden">
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center gap-1">
            <Upload
              size={16}
              className="text-muted-foreground group-hover:text-amber-500 transition-colors"
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {nominee.cnicImage ? 'Replace CNIC Image' : 'Upload CNIC Front'}
            </p>
          </div>
        </div>
      </div>
    </FormField>
  </div>
);

export default NomineeSection;

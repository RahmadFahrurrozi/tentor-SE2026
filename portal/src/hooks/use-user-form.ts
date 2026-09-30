import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

export const userSchema = z
  .object({
    full_name: z.string().min(3, "Nama pengguna minimal 3 karakter."),
    email: z
      .string()
      .email("Format email tidak valid (contoh: user@bps.go.id)."),
    role: z.enum(["admin", "ppl", "pml", "pengolahan"], {
      message: "Role harus dipilih",
    }),
    assignments: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    if (
      (data.role === "ppl" || data.role === "pml") &&
      (!data.assignments || data.assignments.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wajib memilih setidaknya satu wilayah penugasan.",
        path: ["assignments"],
      });
    }
  });

export type UserFormValues = z.infer<typeof userSchema>;

export const useUserForm = (
  onSubmitCallback: (values: UserFormValues) => void,
) => {
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: "",
      email: "",
      role: "" as unknown as UserFormValues["role"],
      assignments: [], // default kosong di sini, bukan di schema
    },
  });

  const onSubmit = (values: UserFormValues) => {
    onSubmitCallback(values);
    form.reset();
  };

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
  };
};

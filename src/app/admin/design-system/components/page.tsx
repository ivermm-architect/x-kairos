"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  type Column,
  DataTable,
  Field,
  Input,
  Modal,
  Select,
  Tabs,
  ToastProvider,
  useToast,
} from "@/components/ui";

type DemoRow = { id: string; name: string; stock: number };

const DEMO_ROWS: DemoRow[] = [
  { id: "1", name: "Café molido 500g", stock: 24 },
  { id: "2", name: "Azúcar rubia 1kg", stock: 8 },
  { id: "3", name: "Té verde 20u", stock: 0 },
];

const COLUMNS: Column<DemoRow>[] = [
  { key: "name", header: "Producto", render: (r) => r.name },
  {
    key: "stock",
    header: "Stock",
    render: (r) => (
      <Badge tone={r.stock === 0 ? "danger" : r.stock < 10 ? "warning" : "success"} dot>
        {r.stock}
      </Badge>
    ),
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-fg">{title}</h2>
      <div className="rounded-lg border border-border bg-surface p-5">{children}</div>
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => toast({ tone: "success", title: "Guardado" })}>
        Success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({ tone: "danger", title: "Error", description: "No se pudo guardar." })
        }
      >
        Danger
      </Button>
      <Button variant="secondary" onClick={() => toast({ tone: "warning", title: "Stock bajo" })}>
        Warning
      </Button>
      <Button variant="secondary" onClick={() => toast({ tone: "info", title: "Sincronizando…" })}>
        Info
      </Button>
    </div>
  );
}

export default function ComponentsShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("general");
  const [tableState, setTableState] = useState<"data" | "loading" | "empty" | "error">("data");
  const [checked, setChecked] = useState(true);

  return (
    <ToastProvider>
      <main className="min-h-dvh bg-app px-6 py-8 text-fg">
        <div className="mx-auto flex max-w-4xl flex-col gap-10">
          <header className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">UI primitives</h1>
            <p className="text-fg-muted">
              The 8-state component library · tokens only · WCAG 2.2 targets ≥44px
            </p>
          </header>

          <Section title="Button — variants & states">
            <div className="flex flex-col gap-4">
              {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
                <div key={variant} className="flex flex-wrap items-center gap-3">
                  <Button variant={variant}>Default</Button>
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                  <Button variant={variant} loading>
                    Loading
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
          </Section>

          <Section title="Form controls">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre" hint="Como aparece en el catálogo.">
                {({ id, describedBy }) => (
                  <Input id={id} aria-describedby={describedBy} placeholder="Café molido" />
                )}
              </Field>
              <Field label="SKU" error="Este SKU ya existe." required>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    defaultValue="CF-500"
                  />
                )}
              </Field>
              <Field label="Categoría">
                {({ id }) => (
                  <Select id={id} defaultValue="">
                    <option value="" disabled>
                      Seleccionar…
                    </option>
                    <option value="bebidas">Bebidas</option>
                    <option value="abarrotes">Abarrotes</option>
                  </Select>
                )}
              </Field>
              <Field label="Estado (deshabilitado)">
                {({ id }) => (
                  <Input id={id} disabled placeholder="No editable" defaultValue="Archivado" />
                )}
              </Field>
              <div className="flex flex-col gap-2">
                <Checkbox
                  label="Activo"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                <Checkbox label="Deshabilitado" disabled />
                <Checkbox label="Con error" invalid />
              </div>
            </div>
          </Section>

          <Section title="Badge — tones">
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">Neutral</Badge>
              <Badge tone="primary" dot>
                Primary
              </Badge>
              <Badge tone="success" dot>
                Activo
              </Badge>
              <Badge tone="warning" dot>
                Stock bajo
              </Badge>
              <Badge tone="danger" dot>
                Agotado
              </Badge>
            </div>
          </Section>

          <Section title="Tabs">
            <Tabs
              items={[
                { value: "general", label: "General" },
                { value: "precios", label: "Precios" },
                { value: "archivado", label: "Archivado", disabled: true },
              ]}
              value={tab}
              onValueChange={setTab}
            >
              <p className="text-sm text-fg-muted">Panel activo: {tab}</p>
            </Tabs>
          </Section>

          <Section title="Data table — states">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {(["data", "loading", "empty", "error"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={tableState === s ? "primary" : "secondary"}
                    onClick={() => setTableState(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
              <DataTable
                columns={COLUMNS}
                rows={tableState === "data" ? DEMO_ROWS : []}
                rowKey={(r) => r.id}
                loading={tableState === "loading"}
                error={tableState === "error" ? "No se pudo cargar el inventario." : undefined}
              />
            </div>
          </Section>

          <Section title="Modal">
            <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Confirmar acción"
              description="Esta acción no se puede deshacer."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="danger" onClick={() => setModalOpen(false)}>
                    Eliminar
                  </Button>
                </>
              }
            >
              <p className="text-sm text-fg-muted">
                El producto se eliminará del catálogo y dejará de verse en la tienda.
              </p>
            </Modal>
          </Section>

          <Section title="Toast">
            <ToastDemo />
          </Section>
        </div>
      </main>
    </ToastProvider>
  );
}

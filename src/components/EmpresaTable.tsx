import { Empresa, MesKey, MES_LABELS, StatusEntrega } from "@/types/fiscal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";

interface EmpresaTableProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
  onEdit: (empresa: Empresa) => void;
  onDelete: (id: string) => void;
  onStatusChange: (empresaId: string, mes: MesKey, campo: keyof Empresa["obrigacoes"]["janeiro"], valor: StatusEntrega) => void;
}

export function EmpresaTable({ empresas, mesSelecionado, onEdit, onDelete, onStatusChange }: EmpresaTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-primary/5 hover:bg-primary/5">
            <TableHead className="w-12">Nº</TableHead>
            <TableHead>Empresa</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-center">Lanç. Fiscal</TableHead>
            <TableHead className="text-center">REINF</TableHead>
            <TableHead className="text-center">DCTF Web</TableHead>
            <TableHead className="text-center">MIT</TableHead>
            <TableHead className="w-24 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {empresas.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                Nenhuma empresa cadastrada.
              </TableCell>
            </TableRow>
          )}
          {empresas.map((empresa) => {
            const ob = empresa.obrigacoes[mesSelecionado];
            const fat = empresa.meses[mesSelecionado].faturamentoTotal;
            return (
              <TableRow key={empresa.id}>
                <TableCell className="font-medium">{empresa.numero}</TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">{empresa.nome}</TableCell>
                <TableCell className="font-mono text-xs">{empresa.cnpj}</TableCell>
                <TableCell className="text-right font-medium">
                  {fat.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </TableCell>
                {(["lancamentoFiscal", "reinf", "dcftWeb", "mit"] as const).map((campo) => (
                  <TableCell key={campo} className="text-center">
                    <StatusSelect
                      value={ob[campo]}
                      onChange={(v) => onStatusChange(empresa.id, mesSelecionado, campo, v)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(empresa)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(empresa.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: StatusEntrega; onChange: (v: StatusEntrega) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as StatusEntrega)}>
      <SelectTrigger className="h-8 w-[110px] mx-auto border-0 bg-transparent p-0 focus:ring-0 [&>svg]:ml-1">
        <StatusBadge status={value} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ok">✅ OK</SelectItem>
        <SelectItem value="pendente">❌ Pendente</SelectItem>
        <SelectItem value="nao_aplicavel">➖ N/A</SelectItem>
      </SelectContent>
    </Select>
  );
}

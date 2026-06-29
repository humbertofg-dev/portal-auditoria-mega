import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RotaProtegida } from "@/components/RotaProtegida";
import { AppShell } from "@/components/layout/AppShell";
import { PaginaLogin } from "@/pages/PaginaLogin";
import { PaginaDashboard } from "@/pages/PaginaDashboard";
import { PaginaJustificativas } from "@/pages/PaginaJustificativas";
import { PaginaPendencias } from "@/pages/PaginaPendencias";
import { PaginaRelatorios } from "@/pages/PaginaRelatorios";
import { PaginaIndicadores } from "@/pages/PaginaIndicadores";
import { PaginaRanking } from "@/pages/PaginaRanking";
import { PaginaProdutos } from "@/pages/PaginaProdutos";
import { PaginaLojas } from "@/pages/PaginaLojas";
import { PaginaRegionais } from "@/pages/PaginaRegionais";
import { PaginaUsuarios } from "@/pages/PaginaUsuarios";
import { PaginaConfiguracoes } from "@/pages/PaginaConfiguracoes";
import { PaginaLogs } from "@/pages/PaginaLogs";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PaginaLogin />} />

          <Route
            element={
              <RotaProtegida>
                <AppShell />
              </RotaProtegida>
            }
          >
            <Route path="/" element={<PaginaDashboard />} />
            <Route path="/justificativas" element={<PaginaJustificativas />} />
            <Route path="/pendencias" element={<PaginaPendencias />} />
            <Route path="/relatorios" element={<PaginaRelatorios />} />
            <Route path="/indicadores" element={<PaginaIndicadores />} />
            <Route path="/ranking" element={<PaginaRanking />} />
            <Route path="/produtos" element={<PaginaProdutos />} />
            <Route path="/lojas" element={<PaginaLojas />} />
            <Route path="/regionais" element={<PaginaRegionais />} />

            <Route
              path="/usuarios"
              element={
                <RotaProtegida perfisPermitidos={["ADMINISTRADOR"]}>
                  <PaginaUsuarios />
                </RotaProtegida>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <RotaProtegida perfisPermitidos={["ADMINISTRADOR"]}>
                  <PaginaConfiguracoes />
                </RotaProtegida>
              }
            />
            <Route
              path="/logs"
              element={
                <RotaProtegida perfisPermitidos={["ADMINISTRADOR"]}>
                  <PaginaLogs />
                </RotaProtegida>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

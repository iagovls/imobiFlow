import { Component, OnInit, Output, EventEmitter, signal, Input, computed } from '@angular/core';
import { Imovel, PropertiesService } from '../../../services/properties.service';
import { S3Service } from '../../../services/s3.service';
import { DatePipe, CurrencyPipe, NgClass } from '@angular/common';
import {
  LucidePlus,
  LucideEdit,
  LucideTrash2,
  LucideHome,
  LucideBed,
  LucideBath,
  LucideCar,
  LucideMapPin,
  LucideSearch,
  LucideFilter,
  LucideImageOff,
} from '@lucide/angular';

@Component({
  selector: 'app-properties-list',
  standalone: true,
  imports: [NgClass, LucidePlus, LucideEdit, LucideTrash2, LucideHome, LucideBed, LucideBath, LucideCar, LucideMapPin, LucideSearch, LucideFilter, LucideImageOff],
  templateUrl: './properties-list.html',
  styleUrl: './properties-list.css',
})
export class PropertiesListComponent implements OnInit {
  @Output() imovelSelected = new EventEmitter<Imovel | null>();
  @Output() createNew = new EventEmitter<void>();

  imoveis = signal<Imovel[]>([]);
  imoveisFiltrados = signal<Imovel[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  filtroFinalidade = signal<'todos' | 'venda' | 'aluguel'>('todos');

  constructor(
    public propertiesService: PropertiesService,
    private s3Service: S3Service,
  ) {}

  async ngOnInit() {
    await this.loadImoveis();
  }

  async loadImoveis() {
    this.loading.set(true);
    const data = await this.propertiesService.getImoveis();
    this.imoveis.set(data);
    this.aplicarFiltros();
    this.loading.set(false);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.aplicarFiltros();
  }

  onFinalidadeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filtroFinalidade.set(select.value as 'todos' | 'venda' | 'aluguel');
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let lista = this.imoveis();

    if (this.filtroFinalidade() !== 'todos') {
      lista = lista.filter((i) => i.finalidade === this.filtroFinalidade());
    }

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      lista = lista.filter((i) => {
        const titulo = i.titulo?.toLowerCase() ?? '';
        const cidade = i.cidade?.nome.toLowerCase() ?? '';
        const bairro = i.bairro?.nome.toLowerCase() ?? '';
        const codigo = i.imv_codigo?.toLowerCase() ?? '';
        const tipo = i.tipo?.toLowerCase() ?? '';
        return (
          titulo.includes(query) ||
          cidade.includes(query) ||
          bairro.includes(query) ||
          codigo.includes(query) ||
          tipo.includes(query)
        );
      });
    }

    this.imoveisFiltrados.set(lista);
  }

  selecionarImovel(imovel: Imovel) {
    this.imovelSelected.emit(imovel);
  }

  async excluirImovel(imovel: Imovel, event: Event) {
    event.stopPropagation();
    const confirmado = window.confirm(
      `Tem certeza que deseja excluir o imóvel "${imovel.titulo || imovel.imv_codigo}"?\nEsta ação não pode ser desfeita.`,
    );
    if (!confirmado) return;
    const sucesso = await this.propertiesService.deleteImovel(imovel.imv_codigo);
    if (sucesso) {
      await this.loadImoveis();
    } else {
      alert('Erro ao excluir imóvel.');
    }
  }

  criarNovo() {
    this.createNew.emit();
  }

  getImagemUrl(imovel: Imovel): string | null {
    if (!imovel.imagem_principal) return null;
    if (imovel.imagem_principal.startsWith('http')) return imovel.imagem_principal;
    return this.s3Service.getS3PublicUrl(imovel.imagem_principal);
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }
}

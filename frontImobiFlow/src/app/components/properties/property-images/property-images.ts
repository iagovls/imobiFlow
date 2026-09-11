import { Component, Input, OnInit, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { Imovel, PropertiesService } from '../../../services/properties.service';
import { S3Service, S3ImageItem } from '../../../services/s3.service';
import { NgClass } from '@angular/common';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  LucideArrowLeft,
  LucideUpload,
  LucideTrash2,
  LucideStar,
  LucideImage,
  LucideImageOff,
  LucideAlertTriangle,
  LucideFolderUp,
  LucideCheck,
  LucideLoader2,
  LucideGripVertical,
} from '@lucide/angular';

@Component({
  selector: 'app-property-images',
  standalone: true,
  imports: [
    NgClass,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    LucideArrowLeft,
    LucideUpload,
    LucideTrash2,
    LucideStar,
    LucideImage,
    LucideImageOff,
    LucideAlertTriangle,
    LucideFolderUp,
    LucideCheck,
    LucideLoader2,
    LucideGripVertical,
  ],
  templateUrl: './property-images.html',
  styleUrl: './property-images.css',
})
export class PropertyImagesComponent implements OnInit {
  @Input() imovel!: Imovel;
  @Output() goBack = new EventEmitter<void>();
  @Output() principalChanged = new EventEmitter<Imovel>();

  private s3Service = inject(S3Service);
  private propertiesService = inject(PropertiesService);

  imagens = signal<S3ImageItem[]>([]);
  loading = signal(true);
  saving = signal(false);
  uploadingProgress = signal<Record<string, number>>({});
  dragging = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  imagemPrincipalUrl = signal<string | null>(null);

  uploadEntries = computed(() => {
    return Object.entries(this.uploadingProgress());
  });

  hasUploads = computed(() => this.uploadEntries().length > 0);

  

  ngOnInit() {
    if (this.imovel?.imagem_principal) {
      this.imagemPrincipalUrl.set(this.resolveUrl(this.imovel.imagem_principal));
    }
    this.carregarImagens();
  }
  
  async carregarImagens() {
    if (!this.imovel?.imv_codigo) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const prefix = this.propertiesService.buildImovelKeyPrefix(this.imovel.imv_codigo);
      const lista = await this.s3Service.listImages(prefix);
      this.imagens.set(this.ordenarPorPreferencia(lista));
    } catch (err) {
      console.error(err);
      this.errorMessage.set('Erro ao carregar galeria de imagens.');
    } finally {
      this.loading.set(false);
    }
  }

  private ordenarPorPreferencia(lista: S3ImageItem[]): S3ImageItem[] {
    const ordem = this.imovel?.imagens_ordem ?? [];
    if (ordem.length === 0) return lista;

    const posicao = new Map(ordem.map((key, index) => [key, index]));
    return [...lista].sort((a, b) => {
      const posA = posicao.has(a.key) ? posicao.get(a.key)! : ordem.length + lista.indexOf(a);
      const posB = posicao.has(b.key) ? posicao.get(b.key)! : ordem.length + lista.indexOf(b);
      return posA - posB;
    });
  }

  onReorder(event: CdkDragDrop<S3ImageItem[]>) {
    const lista = [...this.imagens()];
    moveItemInArray(lista, event.previousIndex, event.currentIndex);
    this.imagens.set(lista);
    void this.salvarOrdem(lista);
  }

  private async salvarOrdem(lista: S3ImageItem[]) {
    if (!this.imovel?.imv_codigo) return;
    const ordem = lista.map((i) => i.key);
    const atualizado = await this.propertiesService.setImagensOrdem(this.imovel.imv_codigo, ordem);
    if (atualizado) {
      this.imovel = atualizado;
      this.principalChanged.emit(atualizado);
    }
  }

  voltar() {
    this.goBack.emit();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
    input.value = '';
  }

  private async processFiles(files: File[]) {
    const imagens = files.filter((f) => f.type.startsWith('image/'));
    if (imagens.length === 0) {
      this.errorMessage.set('Selecione apenas arquivos de imagem (JPG, PNG, WEBP, etc).');
      setTimeout(() => this.errorMessage.set(null), 4000);
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const prefix = this.propertiesService.buildImovelKeyPrefix(this.imovel.imv_codigo);

    let sucessoCount = 0;
    for (const file of imagens) {
      const id = `${Date.now()}_${file.name}`;
      this.uploadingProgress.update((p) => ({ ...p, [id]: 5 }));

      try {
        this.uploadingProgress.update((p) => ({ ...p, [id]: 30 }));
        const presigned = await this.s3Service.generateUploadUrl(
          prefix,
          file.name,
          file.type,
        );

        this.uploadingProgress.update((p) => ({ ...p, [id]: 60 }));
        const uploadOk = await this.s3Service.uploadFile(presigned, file);

        if (uploadOk) {
          this.uploadingProgress.update((p) => ({ ...p, [id]: 100 }));
          sucessoCount++;

          const novaImagem: S3ImageItem = {
            key: presigned.key,
            url: presigned.publicUrl,
            size: file.size,
            lastModified: new Date().toISOString(),
          };
          this.imagens.update((lista) => [novaImagem, ...lista]);
          void this.salvarOrdem(this.imagens());

          if (!this.imagemPrincipalUrl()) {
            await this.definirComoPrincipal(novaImagem, true);
          }
        }
      } catch (err) {
        console.error('Falha no upload:', err);
      } finally {
        setTimeout(() => {
          this.uploadingProgress.update((p) => {
            const { [id]: _, ...rest } = p;
            return rest;
          });
        }, 600);
      }
    }

    if (sucessoCount > 0) {
      this.successMessage.set(
        `${sucessoCount} imagem${sucessoCount > 1 ? 'ns' : ''} enviada${sucessoCount > 1 ? 's' : ''} com sucesso!`,
      );
      setTimeout(() => this.successMessage.set(null), 4000);
      this.carregarImagens();
    } else if (imagens.length > 0) {
      this.errorMessage.set('Falha ao enviar imagens. Verifique a conexão com a API S3.');
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  async excluirImagem(img: S3ImageItem, event?: Event) {
    event?.stopPropagation();
    const confirmado = window.confirm('Tem certeza que deseja excluir esta imagem?');
    if (!confirmado) return;

    try {
      const sucesso = await this.s3Service.deleteImage(img.key);
      if (sucesso) {
        const eraPrincipal = this.resolveUrl(img.key) === this.imagemPrincipalUrl();
        this.imagens.update((lista) => lista.filter((i) => i.key !== img.key));
        void this.salvarOrdem(this.imagens());

        if (eraPrincipal) {
          this.imagemPrincipalUrl.set(null);
          const atualizado = await this.propertiesService.setImagemPrincipal(this.imovel.imv_codigo, null);
          if (atualizado) {
            this.imovel = atualizado;
            this.principalChanged.emit(atualizado);
          }
        }

        this.successMessage.set('Imagem excluída com sucesso.');
        setTimeout(() => this.successMessage.set(null), 3000);
      }
    } catch (err) {
      console.error(err);
      this.errorMessage.set('Erro ao excluir imagem.');
    }
  }

  async definirComoPrincipal(img: S3ImageItem, silent = false) {
    if (this.saving()) return;
    this.saving.set(true);

    try {
      const atualizado = await this.propertiesService.setImagemPrincipal(this.imovel.imv_codigo, img.key);
      if (atualizado) {
        this.imovel = atualizado;
        this.imagemPrincipalUrl.set(this.resolveUrl(img.key));
        this.principalChanged.emit(atualizado);
        if (!silent) {
          this.successMessage.set('Imagem principal definida com sucesso.');
          setTimeout(() => this.successMessage.set(null), 3000);
        }
      }
    } catch (err) {
      console.error(err);
      this.errorMessage.set('Erro ao definir imagem principal.');
    } finally {
      this.saving.set(false);
    }
  }

  isPrincipal(img: S3ImageItem): boolean {
    const url = this.resolveUrl(img.key);
    return this.imagemPrincipalUrl() === url;
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  private resolveUrl(keyOrUrl: string): string {
    if (keyOrUrl.startsWith('http')) return keyOrUrl;
    return this.s3Service.getS3PublicUrl(keyOrUrl);
  }
}

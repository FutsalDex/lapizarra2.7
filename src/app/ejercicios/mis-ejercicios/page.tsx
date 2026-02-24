
"use client";

import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Upload, PlusCircle, X, Save, Loader2, Edit, Image as ImageIcon, List, ArrowRight, BookUser } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDocumentData } from "react-firebase-hooks/firestore";
import { doc, getFirestore, addDoc, updateDoc, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, auth, db, storage } from "@/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "@/components/auth/AuthGuard";
import Image from "next/image";

const exerciseSchema = z.object({
    Ejercicio: z.string().min(1, "El nombre es obligatorio."),
    Número: z.coerce.number().optional(),
    'Descripción de la tarea': z.string().min(1, "La descripción es obligatoria."),
    Objetivos: z.string().min(1, "Los objetivos son obligatorios."),
    Fase: z.string().min(1, "La fase es obligatoria."),
    Categoría: z.string().min(1, "La categoría es obligatoria."),
    'Duración (min)': z.coerce.number().min(1, "La duración es obligatoria."),
    Edad: z.array(z.string()).min(1, "Selecciona al menos una edad."),
    'Número de jugadores': z.coerce.number().min(1, "El número de jugadores es obligatorio."),
    'Espacio y materiales necesarios': z.string().min(1, "Este campo es obligatorio."),
    Variantes: z.string().optional(),
    'Consejos para el entrenador': z.string().optional(),
    Imagen: z.string().optional(),
    youtubeUrl: z.string().url("Debe ser una URL de YouTube válida.").or(z.literal("")).optional(),
    Visible: z.boolean(),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

const SubirEjercicioForm = ({ onCancel, exerciseId }: { onCancel: () => void, exerciseId?: string | null }) => {
    const { toast } = useToast();
    const router = useRouter();
    const isEditMode = !!exerciseId;
    
    const [exerciseDoc, loadingExercise] = useDocumentData(isEditMode ? doc(db, 'exercises', exerciseId) : null);
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ExerciseFormData>({
        resolver: zodResolver(exerciseSchema),
        defaultValues: {
            Visible: true,
            Edad: [],
            youtubeUrl: '',
            Imagen: '',
        }
    });

    useEffect(() => {
        if (isEditMode && exerciseDoc) {
            reset({
                ...exerciseDoc,
                'Duración (min)': exerciseDoc['Duración (min)'],
                'Número de jugadores': exerciseDoc['Número de jugadores'],
            } as any);
            if (exerciseDoc.Imagen) {
                setImagePreview(exerciseDoc.Imagen);
            }
        } else {
            reset({ Visible: true, Edad: [], youtubeUrl: '', Imagen: '' });
            setImageFile(null);
            setImagePreview(null);
        }
    }, [isEditMode, exerciseDoc, reset]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImageFile(null);
            setImagePreview(null);
        }
    };

    const onSubmit = async (data: ExerciseFormData) => {
        const user = auth.currentUser;
        if (!user) {
            toast({ variant: "destructive", title: "No autenticado", description: "Debes iniciar sesión para guardar un ejercicio." });
            return;
        }

        setIsSaving(true);
        try {
            let imageUrl = isEditMode && exerciseDoc ? (exerciseDoc.Imagen || '') : '';
    
            if (imageFile) {
                const filePath = `exercises/${user.uid}/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(storageRef);
            }
    
            if (isEditMode && exerciseId) {
                const updatedData = { ...data, Imagen: imageUrl, updatedAt: new Date() };
                await updateDoc(doc(db, 'exercises', exerciseId), updatedData);
                toast({ title: "Ejercicio actualizado", description: "Los cambios han sido guardados." });
                router.push('/admin/ejercicios/biblioteca');
            } else {
                const newExercise = {
                    ...data,
                    Imagen: imageUrl,
                    userId: user.uid,
                    createdAt: new Date(),
                };
                await addDoc(collection(db, 'exercises'), newExercise);
                toast({ title: "Ejercicio añadido", description: "Tu ejercicio se ha guardado en la biblioteca." });
            }
            
            reset();
            setImageFile(null);
            setImagePreview(null);
            if (!isEditMode) {
                onCancel();
            }

        } catch (error: any) {
            console.error("Error saving exercise:", error);
            toast({ variant: 'destructive', title: 'Error al guardar', description: error.message || 'Ocurrió un error inesperado.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const edades = [
        "Benjamín (8-9 años)", "Alevín (10-11 años)", "Infantil (12-13 años)",
        "Cadete (14-15 años)", "Juvenil (16-18 años)", "Senior (+18 años)",
    ];

    const categorias = [
        "Finalización", "Técnica individual y combinada", "Pase y control", "Transiciones (ofensivas y defensivas)",
        "Coordinación, agilidad y velocidad", "Defensa (individual, colectiva y táctica)", "Conducción y regate",
        "Toma de decisiones y visión de juego", "Posesión y circulación del balón", "Superioridades e inferioridades numéricas",
        "Portero y trabajo específico", "Balón parado y remates", "Contraataques y ataque rápido",
        "Desmarques y movilidad", "Juego reducido y condicionado", "Calentamiento y activación",
    ];

    if (loadingExercise) {
        return (
             <Card className="max-w-4xl mx-auto mt-8">
                <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="max-w-4xl mx-auto mt-8">
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>{isEditMode ? 'Editar Ejercicio' : 'Añadir Ejercicio Individual'}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                    <CardDescription>{isEditMode ? 'Modifica los datos del ejercicio.' : 'Completa el formulario para añadir un nuevo ejercicio a la biblioteca pública.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="Ejercicio">Nombre del Ejercicio</Label>
                            <Input id="Ejercicio" placeholder="Ej: Rondo 4 vs 1" {...register('Ejercicio')} disabled={isSaving} />
                             {errors.Ejercicio && <p className="text-sm text-destructive">{errors.Ejercicio.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Número">Número/ID</Label>
                            <Input id="Número" type="number" placeholder="Ej: 1" {...register('Número')} disabled={isSaving}/>
                             {errors.Número && <p className="text-sm text-destructive">{errors.Número.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="Descripción de la tarea">Descripción</Label>
                        <Textarea id="Descripción de la tarea" placeholder="Explica en qué consiste el ejercicio..." {...register('Descripción de la tarea')} disabled={isSaving}/>
                         {errors['Descripción de la tarea'] && <p className="text-sm text-destructive">{errors['Descripción de la tarea'].message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="Objetivos">Objetivos</Label>
                        <Textarea id="Objetivos" placeholder="¿Qué se busca mejorar con este ejercicio?" {...register('Objetivos')} disabled={isSaving}/>
                        {errors.Objetivos && <p className="text-sm text-destructive">{errors.Objetivos.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Controller name="Fase" control={control} render={({ field }) => (
                             <div className="space-y-2">
                                <Label>Fase</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar fase" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Calentamiento">Calentamiento</SelectItem>
                                        <SelectItem value="Principal">Principal</SelectItem>
                                        <SelectItem value="Vuelta a la Calma">Vuelta a la Calma</SelectItem>
                                        <SelectItem value="Preparación Física">Preparación Física</SelectItem>
                                        <SelectItem value="Específico">Específico</SelectItem>
                                    </SelectContent>
                                </Select>
                                 {errors.Fase && <p className="text-sm text-destructive">{errors.Fase.message}</p>}
                            </div>
                        )}/>
                       <Controller name="Categoría" control={control} render={({ field }) => (
                             <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                                    <SelectContent>
                                        {categorias.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {errors.Categoría && <p className="text-sm text-destructive">{errors.Categoría.message}</p>}
                            </div>
                        )}/>
                        <div className="space-y-2">
                            <Label htmlFor="Duración (min)">Duración (min)</Label>
                            <Input id="Duración (min)" type="number" placeholder="Ej: 15" {...register('Duración (min)')} disabled={isSaving}/>
                            {errors['Duración (min)'] && <p className="text-sm text-destructive">{errors['Duración (min)'].message}</p>}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Edades recomendadas</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                           <Controller
                                name="Edad"
                                control={control}
                                render={({ field }) => (
                                    <>
                                        {edades.map(edad => (
                                            <div key={edad} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={edad}
                                                    checked={field.value?.includes(edad)}
                                                    onCheckedChange={(checked) => {
                                                        const currentValues = field.value || [];
                                                        if (checked) {
                                                            field.onChange([...currentValues, edad]);
                                                        } else {
                                                            field.onChange(currentValues.filter(value => value !== edad));
                                                        }
                                                    }}
                                                    disabled={isSaving}
                                                />
                                                <Label htmlFor={edad} className="font-normal text-sm">{edad}</Label>
                                            </div>
                                        ))}
                                    </>
                                )}
                            />
                        </div>
                        {errors.Edad && <p className="text-sm text-destructive">{errors.Edad.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="Número de jugadores">Nº de Jugadores</Label>
                            <Input id="Número de jugadores" type="number" placeholder="Ej: 5" {...register('Número de jugadores')} disabled={isSaving}/>
                             {errors['Número de jugadores'] && <p className="text-sm text-destructive">{errors['Número de jugadores'].message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="Espacio y materiales necesarios">Espacio y Materiales</Label>
                            <Input id="Espacio y materiales necesarios" placeholder="Ej: Medio campo, 5 conos, 1 balón" {...register('Espacio y materiales necesarios')} disabled={isSaving}/>
                             {errors['Espacio y materiales necesarios'] && <p className="text-sm text-destructive">{errors['Espacio y materiales necesarios'].message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="Variantes">Variantes (Opcional)</Label>
                        <Textarea id="Variantes" placeholder="Añade posibles variaciones..." {...register('Variantes')} disabled={isSaving}/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="Consejos para el entrenador">Consejos (Opcional)</Label>
                        <Textarea id="Consejos para el entrenador" placeholder="Ofrece consejos para la ejecución..." {...register('Consejos para el entrenador')} disabled={isSaving}/>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="image-upload">Imagen del Ejercicio</Label>
                        <Input id="image-upload" type="file" accept="image/*" onChange={handleImageSelect} disabled={isSaving} />
                        {imagePreview ? (
                            <div className="mt-2 relative w-48 h-32">
                                <Image src={imagePreview} alt="Previsualización" layout="fill" className="rounded-md object-contain border p-1" />
                            </div>
                        ) : (
                            <div className="mt-2 flex items-center justify-center w-48 h-32 rounded-md border border-dashed text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="youtubeUrl">URL del Vídeo (Opcional)</Label>
                        <Input id="youtubeUrl" placeholder="https://www.youtube.com/watch?v=..." {...register('youtubeUrl')} disabled={isSaving}/>
                        {errors.youtubeUrl && <p className="text-sm text-destructive">{errors.youtubeUrl.message}</p>}
                    </div>

                     <Controller
                        name="Visible"
                        control={control}
                        render={({ field }) => (
                             <div className="flex items-start justify-between rounded-lg border p-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="visibility-switch" className="text-sm">Visible en la biblioteca pública</Label>
                                    <p className="text-xs text-muted-foreground">Si está desactivado, el ejercicio no será visible para otros usuarios.</p>
                                </div>
                                <Switch id="visibility-switch" checked={field.value} onCheckedChange={field.onChange} disabled={isSaving}/>
                            </div>
                        )}
                    />
                </CardContent>
                <CardFooter>
                    <div className="flex justify-end pt-4 w-full">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 animate-spin" /> : isEditMode ? <Save className="mr-2" /> : <PlusCircle className="mr-2" />}
                            {isEditMode ? 'Guardar Cambios' : 'Añadir Ejercicio'}
                        </Button>
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
};

function PageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const exerciseId = searchParams.get('edit');
    const [view, setView] = useState<'list' | 'form'>('list');

    useEffect(() => {
        if (exerciseId) {
            setView('form');
        }
    }, [exerciseId]);

    const handleCancel = () => {
        setView('list');
        router.push('/ejercicios/mis-ejercicios');
    };

    const isEditing = view === 'form' && exerciseId;
    const isCreating = view === 'form' && !exerciseId;

    const getTitle = () => {
        if (isEditing) return 'Editar Ejercicio';
        if (isCreating) return 'Añadir Ejercicio';
        return 'Mis Ejercicios';
    };

    const getDescription = () => {
        if (isEditing) return 'Modifica los datos y guarda los cambios.';
        if (isCreating) return 'Completa el formulario para añadir un nuevo ejercicio a la biblioteca.';
        return 'Añade nuevos ejercicios a la biblioteca o gestiona los que ya has creado.';
    };

    const getIcon = () => {
        if (isEditing) return <Edit className="w-8 h-8 text-primary" />;
        if (isCreating) return <PlusCircle className="w-8 h-8 text-primary" />;
        return <BookUser className="w-8 h-8 text-primary" />;
    };

    return (
      <AuthGuard>
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <Button variant="outline" asChild>
                    <Link href="/panel">
                        <ArrowLeft className="mr-2" />
                        Volver a Mi Panel
                    </Link>
                </Button>
            </div>
            <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                    <div className="bg-muted p-3 rounded-full inline-flex">
                        {getIcon()}
                    </div>
                </div>
                <h1 className="text-4xl font-bold font-headline">{getTitle()}</h1>
                <p className="text-lg text-muted-foreground mt-2">
                    {getDescription()}
                </p>
            </div>
            {view === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <Card className="flex flex-col">
                        <CardHeader className="items-center text-center">
                            <div className="bg-muted rounded-lg w-14 h-14 flex items-center justify-center mb-4">
                                <PlusCircle className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle>Añadir Ejercicio</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow text-center">
                            <p className="text-muted-foreground">Completa el formulario para añadir un nuevo ejercicio a la biblioteca pública.</p>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => setView('form')} className="w-full">
                                Acceder
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="flex flex-col">
                        <CardHeader className="items-center text-center">
                            <div className="bg-muted rounded-lg w-14 h-14 flex items-center justify-center mb-4">
                                <List className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle>Gestionar Mis Ejercicios</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow text-center">
                            <p className="text-muted-foreground">Visualiza, edita y gestiona los ejercicios que has creado y gana puntos.</p>
                        </CardContent>
                        <CardFooter>
                            <Button asChild variant="default" className="w-full">
                                <Link href="/admin/ejercicios/biblioteca">
                                    Acceder
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
            {view === 'form' && <SubirEjercicioForm onCancel={handleCancel} exerciseId={exerciseId} />}
        </div>
      </AuthGuard>
    );
}


export default function MisEjerciciosPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-8"><Loader2 className="animate-spin" /></div>}>
            <PageContent />
        </Suspense>
    );
}

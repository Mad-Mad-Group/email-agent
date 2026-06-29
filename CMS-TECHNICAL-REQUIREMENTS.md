# CMS Technical Requirements - NestJS

## 1. Purpose

This document defines the recommended technical architecture for building a new CMS project with a React frontend, NestJS backend, and MongoDB database.

The goal is to create a CMS codebase that is:

- Modular
- Type-safe
- Permission-aware
- Easy to extend by domain modules
- Friendly to multilingual content
- Stable for both admin CMS APIs and public client-facing APIs

## 2. Recommended Stack

### Frontend

- React
- Vite
- TypeScript
- React Router
- styled-components
- Axios or TanStack Query for API calls
- i18next / react-i18next for CMS UI translations
- Storybook for reusable component development and testing

### Backend

- NestJS
- TypeScript
- REST API
- MongoDB
- Mongoose via `@nestjs/mongoose`
- JWT authentication
- Role and permission guards
- DTO validation with `class-validator`
- File upload support with Multer / Nest interceptors
- Scheduled jobs with `@nestjs/schedule`

### Database

- MongoDB
- Mongoose schemas
- Audit fields on business records
- Soft delete where needed

## 3. Repository Structure

Recommended monorepo-style structure:

```txt
cms-project/
  cms/
    src/                         React CMS frontend
      api/
      components/                 Page-specific or feature-specific components
      sharedComponents/           Reusable UI components
      context/
      features/
      hooks/
      layouts/
      locales/
      pages/
      styles/
      utils/

    server/                      NestJS backend
      src/
        main.ts
        app.module.ts
        config/
        common/
          decorators/
          filters/
          guards/
          interceptors/
          pipes/
          utils/
        auth/
        users/
        roles/
        settings/
        dashboard/
        uploads/
        jobs/
        products/
        coupons/
        members/
        news/
        events/
        stores/
        announcements/
        notifications/
```

Runtime architecture:

```txt
React CMS frontend
        |
        v
NestJS REST API
        |
        v
MongoDB
```

## 4. Backend Module Pattern

Each business domain should be implemented as a NestJS module.

Example:

```txt
server/src/products/
  products.module.ts
  products.controller.ts
  products.public.controller.ts
  products.service.ts
  dto/
    create-product.dto.ts
    update-product.dto.ts
    list-products-query.dto.ts
  schemas/
    product.schema.ts
    stock-log.schema.ts
```

Responsibilities:

- Controller: request/response layer only
- Service: business logic
- DTO: validation and request shape
- Schema: MongoDB model shape
- Guards: auth, roles, and permissions
- Utils: shared helpers only when reused across modules

Controllers should stay thin. Business logic should live in services.

## 5. API Design

Use REST APIs with a consistent prefix:

```txt
/api/auth
/api/users
/api/roles
/api/settings
/api/dashboard
/api/products
/api/coupons
/api/public/products
/api/public/coupons
```

Admin APIs:

- Require JWT authentication
- Require role checks
- Require permission checks
- Return full admin data where appropriate

Public APIs:

- Should expose only client-safe fields
- Should support `lang` query parameter for localized data
- Should not expose internal audit fields unless required

Recommended success response:

```json
{
  "status": "success",
  "data": {}
}
```

Recommended paginated response:

```json
{
  "status": "success",
  "data": [],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

Recommended error behavior:

- `400` for validation errors or invalid business state
- `401` for unauthenticated requests
- `403` for missing permission
- `404` for missing resources
- `409` for duplicate or conflicting state
- `500` for unexpected server errors

State-changing actions must not return success when the action failed.

## 6. Authentication

Use JWT authentication.

Required auth flows:

- Admin login
- Current user profile
- Change password
- Forgot password
- Reset password
- Email verification, if required
- Logout endpoint, even if token invalidation is stateless

Recommended token behavior:

- Frontend stores access token securely according to project requirements.
- Backend reads `Authorization: Bearer <token>`.
- Token payload should include user id, role, and permission-related metadata if appropriate.
- Backend should always re-check critical permissions server-side.

## 7. Authorization

Use layered authorization:

1. Authentication guard
2. Role guard
3. Permission guard

Recommended decorators:

```ts
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('admin')
@Permission('products.view')
@Get()
listProducts() {}
```

Recommended role model:

- Super admin
- Admin
- Staff
- Read-only admin, if needed
- Custom roles with permission flags

Permissions should be explicit strings:

```txt
core.settings.view
core.settings.update
core.users.view
core.users.create
products.view
products.create
products.update
products.delete
```

## 8. Database Design

Use MongoDB with Mongoose.

Recommended schema conventions:

- Use `created_at`
- Use `updated_at`
- Use `created_by` where useful
- Use `updated_by` where useful
- Use `deleted_at` for soft delete where needed
- Use `last_changes` for audit summaries where needed
- Use ObjectId references for relationships

Example schema folder:

```txt
products/
  schemas/
    product.schema.ts
    stock-log.schema.ts
```

Multilingual content fields can use either flat fields:

```txt
name_zh_TW
name_zh_CN
name_en
```

Or object fields:

```ts
name: {
  zh_TW: string;
  zh_CN?: string;
  en?: string;
}
```

Pick one convention early and use it consistently.

## 9. Validation And DTOs

Use DTO classes with `class-validator`.

Example:

```ts
export class CreateProductDto {
  @IsString()
  name_zh_TW: string;

  @IsOptional()
  @IsString()
  name_en?: string;

  @IsNumber()
  price: number;
}
```

Enable global validation:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }),
);
```

Validation rules:

- Do not trust frontend validation.
- Validate all request bodies.
- Validate query params with DTOs.
- Validate ObjectId params before database queries.
- Use enums for fixed option sets.

## 10. Internationalization

CMS should support three languages by default:

- `zh-TW`
- `zh-CN`
- `en`

Frontend requirements:

- All CMS UI text should come from locale files.
- Do not hardcode user-facing text in components.
- When adding a key, add it to all supported languages.

Backend requirements:

- Public APIs should accept `lang`.
- Public APIs should return localized fields.
- Admin APIs may return all language variants for editing.

Recommended backend helpers:

- `parseLang(value)`
- `localizeDoc(doc, lang)`
- `localizeDocs(docs, lang)`

## 11. Frontend Component Style

Use shared layout and UI components to keep CMS pages consistent.

All reusable components must be placed under `sharedComponents/`.

Use `components/` only for page-specific or feature-specific components that are not intended to be reused across the CMS.

Recommended page composition:

```tsx
<PageLayout sidebar={<Sidebar />}>
  <PageHeader
    title={t('products.title')}
    subtitle={t('products.subtitle')}
    actions={<Button>{t('common.create')}</Button>}
  />

  <FilterBar />

  <Table />

  <Pagination />
</PageLayout>
```

Recommended shared components:

- `sharedComponents/PageLayout`
- `sharedComponents/Sidebar`
- `sharedComponents/PageHeader`
- `sharedComponents/FilterBar`
- `sharedComponents/Table`
- `sharedComponents/Pagination`
- `sharedComponents/Button`
- `sharedComponents/StatusBadge`
- `sharedComponents/ConfirmDialog`
- `sharedComponents/FormField`
- `sharedComponents/ImageUploader`
- `sharedComponents/RichTextEditor`
- `sharedComponents/TranslationFields`

Component rules:

- Use function components.
- Use typed props.
- Keep page components focused on orchestration.
- Move reusable UI into `sharedComponents/`.
- Move reusable data fetching into API modules or hooks.
- Use design tokens from the theme.
- Do not create one-off table styles for each page.
- Add or update Storybook stories for every reusable component.
- Cover key component states in Storybook, such as loading, empty, disabled, error, long text, and mobile width where relevant.

## 12. Storybook

Storybook is required for reusable CMS components.

Storybook should be used to:

- Build reusable components in isolation.
- Document component props and expected usage.
- Test visual states before integrating components into pages.
- Review responsive behavior.
- Catch broken styles during frontend changes.

Recommended Storybook file pattern:

```txt
sharedComponents/
  Button/
    Button.tsx
    Button.stories.tsx
    index.ts
  Table/
    Table.tsx
    Table.stories.tsx
    index.ts
```

Story requirements:

- Every reusable component in `sharedComponents/` should have at least one story.
- Form controls should include normal, disabled, error, and filled states.
- Data display components should include loading, empty, short content, and long content states.
- Components with responsive behavior should include mobile and desktop examples.
- Stories should use realistic CMS content, not placeholder-only examples.

## 13. Styling

Use `styled-components` with a shared theme.

Recommended theme tokens:

- Colors
- Font families
- Font sizes
- Font weights
- Breakpoints
- Spacing
- Border radius
- Shadows, if needed

CMS UI should be:

- Clean
- Dense enough for admin workflows
- Responsive
- Accessible
- Consistent across modules

Avoid decorative layouts that reduce data scanning efficiency.

## 14. File Uploads

Use NestJS interceptors for file uploads.

Upload requirements:

- Validate file size.
- Validate file type.
- Store files under a predictable upload directory or external object storage.
- Serve uploads through `/uploads` or a configured public asset domain.
- Return stable URL paths from the API.
- Frontend should normalize asset URLs through a helper.

Example:

```ts
@Post()
@UseInterceptors(FileInterceptor('image'))
createProduct(
  @UploadedFile() image: Express.Multer.File,
  @Body() dto: CreateProductDto,
) {}
```

## 15. Scheduled Jobs

Use `@nestjs/schedule` for recurring backend work.

Recommended jobs module:

```txt
server/src/jobs/
  jobs.module.ts
  coupon-expiry.job.ts
  birthday-reward.job.ts
  notification-delivery.job.ts
```

Job rules:

- Jobs should be idempotent.
- Jobs should log start, result, and error states.
- Jobs should avoid processing unbounded data in one run.
- Long jobs should use batching.

## 16. Error Handling

Use NestJS exceptions.

Common exceptions:

- `BadRequestException`
- `UnauthorizedException`
- `ForbiddenException`
- `NotFoundException`
- `ConflictException`
- `InternalServerErrorException`

Use a global exception filter to normalize error response shape.

Recommended error response:

```json
{
  "status": "error",
  "message": "Permission denied",
  "code": "PERMISSION_DENIED"
}
```

## 17. Logging And Audit

Backend should log:

- Auth events
- Admin create/update/delete actions
- Permission failures
- Upload failures
- Scheduled job results
- Unexpected server errors

Business-critical updates should record:

- Actor user id
- Action
- Target resource
- Timestamp
- Before/after summary where practical

## 18. Security

Minimum security requirements:

- Use Helmet or equivalent secure headers.
- Restrict CORS by environment.
- Hash passwords with bcrypt.
- Never log passwords, tokens, or secrets.
- Validate all inputs.
- Enforce server-side permissions.
- Limit upload file size and file type.
- Keep secrets in environment variables.
- Use HTTPS in production.

## 19. Testing

Recommended test layers:

- Unit tests for services
- Guard tests for authorization
- DTO validation tests for important request shapes
- Integration tests for critical API flows
- E2E tests for login and core admin workflows
- Storybook stories for reusable frontend components
- Storybook interaction tests where components have meaningful behavior

Minimum critical flows:

- Login
- Permission denied
- Create/update/delete content
- File upload
- Public API localized response
- Scheduled job dry run or controlled run
- Shared component visual states in Storybook

## 20. Development Commands

Recommended backend commands:

```bash
cd cms/server
npm run start:dev
npm run build
npm run test
```

Recommended frontend commands:

```bash
cd cms
npm run dev
npm run build
npm run storybook
npm run build-storybook
```

## 21. Acceptance Criteria

A new CMS project is considered technically ready when:

- CMS frontend can authenticate with the NestJS backend.
- Admin route protection works.
- Role and permission checks work.
- Domain modules can be added without changing unrelated modules.
- Public APIs can return localized content.
- MongoDB schemas are defined and connected through Nest modules.
- File uploads work.
- Scheduled jobs can run.
- Error responses are consistent.
- Reusable frontend components live under `sharedComponents/`.
- Reusable frontend components have Storybook stories.
- Storybook can run locally and build successfully.
- Production builds pass.
- TypeScript has no errors.

## 22. Engineering Principles

- Keep controllers thin.
- Keep services testable.
- Keep DTOs explicit.
- Keep domain modules isolated.
- Keep API responses predictable.
- Keep permissions server-enforced.
- Keep multilingual data consistent.
- Prefer clear structure over clever abstraction.
